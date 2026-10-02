import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { storageService } from './storage';

let supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  // 1. Tenta carregar do localStorage (configurado via modal na tela)
  const savedConfig = storageService.getSupabaseConfig();
  if (savedConfig?.url && savedConfig?.anonKey) {
    try {
      supabaseClient = createClient(savedConfig.url, savedConfig.anonKey);
      return supabaseClient;
    } catch (err) {
      console.warn('Erro ao inicializar Supabase a partir do config salvo:', err);
    }
  }

  // 2. Tenta carregar de variáveis de ambiente do Vite
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (envUrl && envKey && !envUrl.includes('placeholder')) {
    try {
      supabaseClient = createClient(envUrl, envKey);
      return supabaseClient;
    } catch (err) {
      console.warn('Erro ao inicializar Supabase via .env:', err);
    }
  }

  return null;
}

export function resetSupabaseClient(): void {
  supabaseClient = null;
}

export function isSupabaseConnected(): boolean {
  return getSupabase() !== null;
}
