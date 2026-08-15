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

## 📅 Evento

06 de fevereiro de 2027 às 08:00 • Cascavel - PR
