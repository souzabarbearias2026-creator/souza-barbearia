import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const [clients, subscriptions, payments, appointments, settings, services] = await Promise.all([
    supabase.from("clients").select("*").order("name"),
    supabase.from("subscriptions").select("*"),
    supabase.from("payments").select("*"),
    supabase.from("appointments").select("*"),
    supabase.from("settings").select("*").eq("id", 1).single(),
    supabase.from("services").select("*").eq("active", true).order("sort_order"),
  ]);

  const firstError = [clients, subscriptions, payments, appointments, settings, services].find((r) => r.error);
  if (firstError) return Response.json({ error: firstError.error.message }, { status: 500 });

  return Response.json({
    clients: clients.data,
    subscriptions: subscriptions.data,
    payments: payments.data,
    appointments: appointments.data,
    settings: settings.data,
    services: services.data,
  });
}
