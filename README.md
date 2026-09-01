# Barbearia — Controle de Clientes

Sistema completo pra controlar assinaturas mensais (cabelo / cabelo + barba, com
valor individual por cliente), agenda de horários e lembretes automáticos por
e-mail. Pronto pra rodar de graça no Vercel + Supabase + Resend.

## O que já vem pronto
- Cadastro de clientes com plano e **valor customizável por pessoa**
- Cálculo automático do vencimento (1 mês após o último pagamento, ou após o
  início da assinatura se ainda não houve pagamento)
- Painel com quem está atrasado / vencendo em breve
- Agenda do dia com horários livres/ocupados, já considerando pausa de almoço
  e domingo fechado
- Lista de serviços avulsos (não-mensalistas) editável em Ajustes — o barbeiro
  adiciona hidratação, botox, pigmentação etc. sozinho, sem depender de você
- E-mail automático diário de lembrete e de atraso (Vercel Cron + Resend)
- E-mail manual de "sentimos sua falta", com texto editável em Ajustes
- Tela protegida por senha única

## Dados já configurados de fábrica
Ajustados com base no que o Davyd passou — dá pra mudar tudo depois em Ajustes:
- **Horário**: segunda a sábado, 10h–20h, com pausa de almoço 12h–13h30; domingo fechado
- **Planos mensais**: Cabelo ilimitado R$ 59,99 · Cabelo + Barba R$ 79,99
- **Serviços avulsos**: Só máquina R$ 20 · Degradê R$ 25 · Só tesoura R$ 30 ·
  Corte, barba e sobrancelha R$ 45

## Passo a passo pra colocar no ar

### 1. Banco de dados (Supabase — grátis)
1. Crie uma conta em [supabase.com](https://supabase.com) e um novo projeto.
2. Vá em **SQL Editor > New query**, cole o conteúdo de `supabase/schema.sql`
   e rode.
3. Em **Project Settings > API**, copie a **Project URL** e a chave
   **service_role** (não a `anon`! essa fica só no servidor).

### 2. E-mails (Resend — grátis até 3.000/mês)
1. Crie uma conta em [resend.com](https://resend.com).
2. Gere uma API key em **API Keys**.
3. Verifique um domínio (ou use o domínio de testes do Resend enquanto isso;
   nesse caso os e-mails só chegam pro seu próprio endereço cadastrado no
   Resend — verifique um domínio de verdade quando for usar com clientes).

### 3. Subir o código pro GitHub
```bash
cd barbearia-nextjs
npm install
git init && git add . && git commit -m "primeira versão"
```
Crie um repositório no GitHub e faça o push (`git remote add origin ...` e
`git push`).

### 4. Deploy no Vercel (grátis)
1. Em [vercel.com](https://vercel.com), clique em **New Project** e importe o
   repositório.
2. Em **Environment Variables**, adicione (copiando de `.env.example`):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `EMAIL_FROM` (ex: `Barbearia <contato@seudominio.com>`)
   - `APP_PASSWORD` (a senha que vai proteger o sistema)
   - `CRON_SECRET` (qualquer string aleatória, ex: gere uma em
     [1password.com/password-generator](https://1password.com/password-generator))
3. Clique em **Deploy**.
4. O `vercel.json` já configura o cron pra rodar todo dia às 12h (horário
   UTC — ajuste o `schedule` se quiser outro horário). O Vercel injeta o
   header `Authorization: Bearer <CRON_SECRET>` automaticamente nessas
   chamadas agendadas.

### 5. Usar
Acesse a URL que o Vercel te deu, entre com a `APP_PASSWORD` que você
configurou, e comece a cadastrar os clientes do seu amigo.

## Rodando localmente (opcional, pra testar antes de subir)
```bash
npm install
cp .env.example .env.local   # preencha as variáveis
npm run dev
```
Abra `http://localhost:3000`.

## Estrutura do projeto
```
app/
  page.js               → tela principal (dashboard, clientes, agenda, ajustes)
  login/page.js          → tela de senha
  api/
    data/                → GET com todos os dados de uma vez
    clients/              → criar / editar / remover clientes e assinaturas
    payments/              → registrar pagamento
    appointments/           → criar / cancelar horário
    settings/                → salvar configurações
    reengajamento/            → disparo manual do e-mail "sentimos sua falta"
    cron/lembretes/            → job diário de lembrete/atraso
    auth/                        → login e logout por senha
lib/
  supabase.js   → cliente do banco (chave service_role, só no servidor)
  dates.js      → cálculo de vencimento
supabase/schema.sql → estrutura do banco
```

## Custo
- Vercel (hospedagem + cron): grátis no plano Hobby
- Supabase (banco): grátis até 500 MB / 50 mil usuários ativos por mês
- Resend (e-mail): grátis até 3.000 e-mails/mês

Isso cobre tranquilamente o uso de uma barbearia individual. Se um dia a base
crescer muito, os planos pagos de qualquer um desses serviços começam bem
baratos.

## Próximos passos possíveis (não incluídos aqui)
- Login de verdade com múltiplos usuários (Supabase Auth), caso mais gente
  além do barbeiro precise acessar
- Confirmação de agendamento por WhatsApp
- Relatório mensal de faturamento
