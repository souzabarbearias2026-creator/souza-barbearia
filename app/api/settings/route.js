import { supabase } from "@/lib/supabase";

export async function PATCH(request) {
  const body = await request.json();
  const { error } = await supabase.from("settings").update(body).eq("id", 1);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
