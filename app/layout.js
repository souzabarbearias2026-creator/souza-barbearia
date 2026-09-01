import "./globals.css";

export const metadata = {
  title: "Souza Barbearia — Controle de Clientes",
  description: "Controle de clientes mensais, assinaturas e agenda",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
