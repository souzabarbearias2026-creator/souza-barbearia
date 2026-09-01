import { createClient } from "@supabase/supabase-js";

// Usa a service_role key — só roda no servidor (rotas de API), nunca no navegador.
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);
