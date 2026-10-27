# 💍 Casamento Jefferson & Beatriz

[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://casamento-ten-rho.vercel.app/)
[![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E?logo=supabase)](https://supabase.com/)
[![Mercado Pago](https://img.shields.io/badge/Payments-Mercado_Pago-009EE3)](https://www.mercadopago.com.br/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS_v3-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-purple?logo=pwa)](https://web.dev/progressive-web-apps/)

Plataforma web fullstack serverless de alta disponibilidade desenvolvida para o evento de casamento dos noivos Jefferson & Beatriz, contemplando RSVP individualizado, lista de presentes com checkout transparente Pix / Mercado Pago, autenticação segura e painel administrativo de gestão integrado ao Supabase (PostgreSQL com RLS).

Deploy em produção na [Vercel](https://casamento-ten-rho.vercel.app/).

---

## 📋 Visão Geral

Projeto fullstack serverless desenvolvido para centralizar a comunicação com os convidados e a gestão completa do evento pelos noivos:

- **Página Principal (`index.html`):** Contagem regressiva, história do casal, cronograma, informações de local e integração com mapas.
- **Convite & RSVP (`convite.html`):** Confirmação de presença individualizada por código de convite com leitura e atualização em tempo real no Supabase.
- **Lista de Presentes (`gifts.html`):** Catálogo de cotas e presentes com checkout transparente, geração de Pix copia-e-cola / QR Code dinâmico e integração com Mercado Pago.
- **Painel de Organização (`organizacao.html`):** Painel protegido por autenticação (Supabase Auth) para controle de convidados, confirmações, finanças, presentes recebidos, tarefas e log de auditoria.
- **PWA:** Suporte a Progressive Web App com `manifest.json` e Service Worker (`sw.js`).
- **Keep-Alive Serverless (`api/keep-alive.js`):** Endpoint acionado periodicamente via Vercel Cron para manter o projeto Supabase ativo sem pausas por inatividade.

---

## 🛠️ Tecnologias e Arquitetura

- **Frontend:** HTML5 semântico, JavaScript moderno (ES Modules), Tailwind CSS v3 (compilado via CLI) e Lucide Icons / FontAwesome.
- **Backend Serverless (Vercel Functions):**
  - `api/create-pix-qr.js` — Criação de cobrança Pix imediata via API do Mercado Pago.
  - `api/check-pix-status.js` — Consulta do status de transação Pix.
  - `api/create-gift-preference.js` — Criação de preferência de checkout no Mercado Pago.
  - `api/process-gift-payment.js` — Processamento de pagamento de presentes.
  - `api/mp-webhook.js` — Webhook de notificação do Mercado Pago com atualização de status no Supabase via chave de serviço (`SUPABASE_SERVICE_ROLE_KEY`).
  - `api/keep-alive.js` — Heartbeat programado via Cron para persistência de conexão no Supabase.
- **Banco de Dados & Autenticação:** Supabase (PostgreSQL) com Row Level Security (RLS) estrito, autenticação por e-mail/senha e migrations versionadas em `db/`.

---

## 📁 Estrutura do Repositório

```text
.
├── api/                   # Serverless Functions (Mercado Pago, Pix, Webhooks, Cron)
├── css/                   # Folhas de estilo compiladas (output.css)
├── db/                    # Scripts SQL de schema e migrations incrementais
│   ├── schema.sql         # Schema principal com tabelas e políticas RLS
│   └── migrations/        # Migrações versionadas (001 a 009)
├── img/                   # Imagens e assets do casal e local
├── js/                    # Módulos frontend em JavaScript
│   ├── config.example.js  # Modelo de configuração para ambiente local
│   ├── config.js          # Configuração gerada (ignorado no git)
│   ├── main.js            # Lógica principal das páginas
│   ├── organizacao.js     # Lógica do painel administrativo
│   └── gifts.js           # Lógica do catálogo e checkout de presentes
├── src/
│   └── input.css          # Ponto de entrada das diretivas Tailwind
├── build-config.js        # Script de injeção de variáveis de ambiente no build
├── convite.html           # Página de convite individual e RSVP
├── faq.html               # Dúvidas frequentes para os convidados
├── gifts.html             # Lista de presentes e pagamento Pix
├── index.html             # Landing page do casamento
├── organizacao.html       # Painel administrativo dos noivos
├── manifest.json          # Manifesto do PWA
├── sw.js                  # Service Worker
├── tailwind.config.js     # Configuração do Tailwind CSS
└── vercel.json            # Configuração de rotas, headers e crons na Vercel
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- Node.js 18+ instalado
- Conta no [Supabase](https://supabase.com/) com as tabelas criadas a partir de `db/schema.sql`

### 1. Clonar e instalar dependências

```bash
git clone https://github.com/JeffersonTeles/Casamento.git
cd Casamento
npm install
```

### 2. Configurar variáveis para o frontend

Copie o arquivo de exemplo e preencha as variáveis de acesso público do Supabase:

```bash
cp js/config.example.js js/config.js
```

Edite `js/config.js` com a sua URL do Supabase, chave pública `anon` e e-mails autorizados para a área administrativa:

```javascript
window.ENV = {
  SUPABASE_URL: "https://seu-projeto.supabase.co",
  SUPABASE_ANON_KEY: "sua-chave-anon-publica",
  ADMIN_EMAILS: ["noivo@email.com", "noiva@email.com"]
};
```

> **Aviso de segurança:** O arquivo `js/config.js` está listado no `.gitignore` e nunca deve ser versionado.

### 3. Compilar os estilos e assets

```bash
npm run build
```

O comando executa `build-config.js` (gerando `js/config.js` a partir de variáveis de ambiente quando executado em CI/Vercel) e compila o CSS minificado do Tailwind em `css/output.css`.

### 4. Executar localmente

Você pode servir a pasta raiz com qualquer servidor estático HTTP:

```bash
# Exemplo com npx serve:
npx serve .

# Ou com Python:
python3 -m http.server 3000
```

Abra `http://localhost:3000` no seu navegador.

---

## ☁️ Deploy e Variáveis de Ambiente (Vercel)

Na Vercel, o script `npm run build` gera automaticamente o `js/config.js` a partir das variáveis configuradas no painel do projeto:

| Variável | Escopo | Descrição |
| --- | --- | --- |
| `REACT_APP_SUPABASE_URL` | Frontend | URL pública do projeto Supabase |
| `REACT_APP_SUPABASE_ANON_KEY` | Frontend | Chave pública `anon` do Supabase |
| `REACT_APP_ADMIN_EMAIL` | Frontend | E-mail do noivo com permissão de admin |
| `REACT_APP_SECOND_ADMIN_EMAIL` | Frontend | E-mail da noiva com permissão de admin |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend (API) | Chave com privilégios de serviço (usada exclusivamente no webhook para atualizar pagamentos confirmados) |
| `MP_ACCESS_TOKEN` | Backend (API) | Token de produção ou teste da API do Mercado Pago |
| `CRON_SECRET` | Backend (API) | Chave de proteção para o endpoint `api/keep-alive` |

---

## 🔒 Segurança e Boas Práticas

- **Row Level Security (RLS):** Toda manipulação de dados de convidados, confirmações e finanças é validada no PostgreSQL via políticas de RLS e funções RPC.
- **Isolamento de Chaves:** Chaves de privilégio elevado (`SUPABASE_SERVICE_ROLE_KEY` e `MP_ACCESS_TOKEN`) são restritas ao ambiente das serverless functions (`api/`), nunca expostas no código cliente do navegador.
- **Painel Administrativo:** O acesso ao painel de organização valida tanto a sessão autenticada no Supabase Auth quanto a lista explícita de e-mails em `ADMIN_EMAILS`.

---

## 📅 Informações do Evento

- **Data:** 06 de fevereiro de 2027 às 08:00
- **Local:** Cascavel - PR
