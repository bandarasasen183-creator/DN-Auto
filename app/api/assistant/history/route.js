import { createClient } from '@/lib/supabase/server';
import { getSessionUser } from '@/lib/auth/session';

export const runtime = 'nodejs';

/** Lists the caller's past conversations, or the messages in one of them. */
export async function GET(request) {
  const session = await getSessionUser();
  if (!session) {
    return Response.json({ error: 'Please sign in first.' }, { status: 401 });
  }

  const supabase = createClient();
  const conversationId = new URL(request.url).searchParams.get('conversation');

  if (conversationId) {
    const { data, error } = await supabase
      .from('assistant_messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ messages: data ?? [] });
  }

  const { data, error } = await supabase
    .from('assistant_conversations')
    .select('id, title, updated_at')
    .order('updated_at', { ascending: false })
    .limit(30);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ conversations: data ?? [] });
}
