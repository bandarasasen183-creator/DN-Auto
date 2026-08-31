import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/session';
import { buildSystemPrompt } from '@/lib/assistant/prompt';
import { findOutOfScope } from '@/lib/business';

export const runtime = 'nodejs';

const MODEL = 'claude-opus-5';
const MAX_TURNS = 20; // plenty for a service conversation, and bounds the bill

/**
 * DN Assist. Streams a reply and persists the exchange so the History tab is
 * a real conversation log rather than something kept in the browser.
 */
export async function POST(request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: 'The assistant is not configured yet.' },
      { status: 503 }
    );
  }

  const session = await getSessionUser();
  if (!session) {
    return Response.json({ error: 'Please sign in first.' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Bad request.' }, { status: 400 });
  }

  const message = String(body?.message ?? '').trim();
  if (!message) {
    return Response.json({ error: 'Say something first.' }, { status: 400 });
  }
  if (message.length > 4000) {
    return Response.json({ error: 'That message is too long.' }, { status: 400 });
  }

  const supabase = createClient();

  // --- Conversation ----------------------------------------------------
  let conversationId = body?.conversationId ?? null;

  if (conversationId) {
    // RLS already restricts this, but checking here turns a silent empty
    // history into an explicit error.
    const { data } = await supabase
      .from('assistant_conversations')
      .select('id')
      .eq('id', conversationId)
      .maybeSingle();
    if (!data) conversationId = null;
  }

  if (!conversationId) {
    const { data, error } = await supabase
      .from('assistant_conversations')
      .insert({
        user_id: session.profile.id,
        title: message.slice(0, 60),
      })
      .select('id')
      .single();
    if (error) {
      return Response.json({ error: 'Could not start a conversation.' }, { status: 500 });
    }
    conversationId = data.id;
  }

  const [{ data: history }, { data: services }] = await Promise.all([
    supabase
      .from('assistant_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(MAX_TURNS * 2),
    supabase
      .from('services')
      .select('name, description, base_price_cents, price_is_from')
      .eq('is_active', true)
      .order('sort_order'),
  ]);

  await supabase.from('assistant_messages').insert({
    conversation_id: conversationId,
    role: 'user',
    content: message,
  });

  // A request for work we don't do gets a straight answer without spending a
  // model call on it.
  const outOfScope = findOutOfScope(message);
  if (outOfScope) {
    const reply = `We don't do ${outOfScope} at DN Auto — we stick to what we're properly equipped for, which is repairs on petrol vehicles. Anything else on the car, though, we're happy to look at. What else is going on with it?`;
    await supabase.from('assistant_messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: reply,
    });
    return new Response(reply, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Conversation-Id': conversationId },
    });
  }

  const messages = [
    ...(history ?? []).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];

  const anthropic = new Anthropic();

  const encoder = new TextEncoder();
  let full = '';

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = anthropic.messages.stream({
          model: MODEL,
          max_tokens: 1024,
          // A counter conversation doesn't need deep reasoning, and low effort
          // keeps replies short and the cost sane.
          output_config: { effort: 'low' },
          system: buildSystemPrompt({
            services: services ?? [],
            profile: session.profile,
          }),
          messages,
        });

        for await (const event of response) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            full += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        const fallback =
          '\n\nSorry — I lost my connection there. Please try again, or call the workshop directly.';
        full += fallback;
        controller.enqueue(encoder.encode(fallback));
      } finally {
        controller.close();
        // Persist whatever was actually said, even a partial reply.
        if (full.trim()) {
          await supabase.from('assistant_messages').insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: full,
          });
          await supabase
            .from('assistant_conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', conversationId);
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Conversation-Id': conversationId,
    },
  });
}
