import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://qqrytklikyvqkncjibbi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxcnl0a2xpa3l2cWtuY2ppYmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyOTc3MjQsImV4cCI6MjEwMzg3MzcyNH0.rLZxZSA_Ig0-Y0QExVO1f97x5T8G1ff1q6-MuxuMBLk'
);
async function run() {
  const { data, error } = await supabase.from('bookings').insert({}).select('*');
  console.log(error);
}
run();
