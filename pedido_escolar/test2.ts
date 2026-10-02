import { supabase } from './src/services/supabaseClient'; async function run() { console.log('PRICES', await supabase.from('campaign_prices').select('*')); } run();
