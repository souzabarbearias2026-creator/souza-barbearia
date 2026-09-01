export async function POST(request) {
  const { password } = await request.json();

  if (!password || password !== process.env.APP_PASSWORD) {
    return Response.json({ error: "Senha incorreta" }, { status: 401 });
  }

  const res = Response.json({ ok: true });
  res.headers.set(
    "Set-Cookie",
    `barbearia_auth=${password}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`
  );
  return res;
}
