import { supabase } from "@/lib/supabase";

export async function POST(request) {
  const { name, price } = await request.json();
  if (!name?.trim() || price == null) {
    return Response.json({ error: "Nome e preço são obrigatórios" }, { status: 400 });
  }
  const { data: maxRow } = await supabase
    .from("services")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = (maxRow?.sort_order ?? 0) + 1;

  const { data, error } = await supabase
    .from("services")
    .insert({ name: name.trim(), price, active: true, sort_order: nextOrder })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ service: data });
}
