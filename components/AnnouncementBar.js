import { createClient } from '@/lib/supabase/server';
import Icon from '@/components/Icon';

/**
 * Site-wide notice, edited by admin in Settings. Renders nothing at all when
 * there's no announcement, so it never leaves an empty strip behind.
 */
export default async function AnnouncementBar() {
  const supabase = createClient();
  const { data } = await supabase
    .from('workshop_settings')
    .select('announcement')
    .eq('id', 1)
    .maybeSingle();

  if (!data?.announcement) return null;

  return (
    <div className="announce" role="status">
      <Icon name="info" size={16} />
      <span>{data.announcement}</span>
    </div>
  );
}
