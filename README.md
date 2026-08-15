# 💍 Casamento Jefferson & Beatriz

Site e painel de organização do casamento. Deploy em produção na [Vercel](https://casamento-ten-rho.vercel.app/).

## 📁 Estrutura

- **`casamento-jefferson-bia/`** — App React com painel administrativo, RSVP individual, exportação de convites (PDF/Excel/CSV), QR Code e login dos noivos (Supabase Auth).
- **Raiz do repositório** — Site estático em HTML/CSS/JS (Tailwind via CDN):
  - `index.html` — página inicial com countdown e convite
  - `rsvp.html` — confirmação de presença por link individual
  - `organizacao.html` — painel de organização (tarefas, convidados, financeiro, notas, auditoria)
  - `faq.html` / `gifts.html` — dúvidas frequentes e lista de presentes
- **`api/keep-alive.js`** — cron da Vercel para manter o Supabase ativo.

## 🚀 Rodando o app React

```bash
cd casamento-jefferson-bia
npm install
npm start
```

O app usa Supabase. Configure as variáveis no `.env` (veja `src/lib/supabaseClient.js`):
`REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`, `REACT_APP_ADMIN_EMAIL`, `REACT_APP_ADMIN_USERNAME`.

## 🧰 Rodando o site estático

Basta abrir `index.html` no navegador — não precisa de servidor.

### Configuração do Supabase (páginas estáticas)

As páginas `index.html`, `rsvp.html` e `organizacao.html` leem as credenciais de `js/config.js`
(excluído do git). Para rodar localmente:

```bash
cp js/config.example.js js/config.js
# edite js/config.js com sua URL e chave anon
```

**Nunca** commite `js/config.js` — ele está no `.gitignore`.

### Em produção (Vercel)

`js/config.js` é gerado automaticamente no build pelo `build-config.js`
(script `npm run build`), a partir das variáveis de ambiente:

| Variável | Descrição |
| --- | --- |
| `REACT_APP_SUPABASE_URL` (ou `SUPABASE_URL`) | URL do projeto Supabase |
| `REACT_APP_SUPABASE_ANON_KEY` (ou `SUPABASE_ANON_KEY`) | Chave anon pública |
| `REACT_APP_ADMIN_EMAIL` (ou `SUPABASE_ADMIN_EMAIL`) | E-mail do noivo (admin) |
| `REACT_APP_SECOND_ADMIN_EMAIL` (ou `SUPABASE_SECOND_ADMIN_EMAIL`) | E-mail da noiva (admin) |

Se `adminEmails` ficar vazio, o painel aceita qualquer e-mail autenticado no Supabase
(fallback para testes — preencha os e-mails para restringir o acesso).

### Banco de dados (RLS)

As políticas de segurança (Row Level Security) e as funções RPC usadas pelo site estão em
`db/schema.sql`. Execute o conteúdo desse arquivo no **SQL Editor** do Supabase.

- Chave `anon` é pública por design — a segurança real vem das políticas RLS + Supabase Auth.
- Crie os usuários dos noivos em **Authentication → Users** (ou via painel `organizacao.html`).

## 📅 Evento

06 de fevereiro de 2027 às 08:00 • Cascavel - PR
