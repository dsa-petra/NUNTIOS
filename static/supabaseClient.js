import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const supabaseUrl = 'https://mgzyrcnkmaepybaeznij.supabase.co';
export const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nenlyY25rbWFlcHliYWV6bmlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0NzIxMDQsImV4cCI6MjEwNzA0ODEwNH0.kAtmUAKSn53owxV8eNHfSOtkeQkjs5RkxVD54p_2Vlk';

export const supabase = createClient(supabaseUrl, supabaseKey);
