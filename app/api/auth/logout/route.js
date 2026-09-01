export async function POST() {
  const res = Response.json({ ok: true });
  res.headers.set(
    "Set-Cookie",
    "barbearia_auth=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0"
  );
  return res;
}
