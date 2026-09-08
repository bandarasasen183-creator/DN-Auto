'use server';
import { createClient } from '@/lib/supabase/server';

export async function searchVehicles(q) {
  const supabase = createClient();
  const key = q.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (!key || key.length < 2) return [];

  const { data } = await supabase
    .from('vehicle_records')
    .select('registration, make, model')
    .ilike('plate_key', `%${key}%`)
    .limit(10);
    
  return data || [];
}
