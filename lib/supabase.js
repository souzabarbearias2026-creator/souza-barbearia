import { createClient } from "@supabase/supabase-js";

// Usa a service_role key — só roda no servidor (rotas de API), nunca no navegador.
// fetch customizado com no-store: dentro de Promise.all, o Next.js perde o
// contexto de rota dinâmica e cacheia as chamadas via Data Cache mesmo com
// `dynamic = "force-dynamic"` no route.js. Forçando aqui garante dado sempre fresco.
export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
    global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }) },
  }
);
