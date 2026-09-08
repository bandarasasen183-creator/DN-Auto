import { supabase } from '../supabase/client.js';

async function test() {
  const { data, error } = await supabase.from('bookings').select('id').limit(1);
  console.log(data, error);
}
test();
