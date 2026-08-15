# Casamento Jefferson e Bia

Site do casamento de Jefferson e Bia.

## Desenvolvimento

### Instalação

```bash
npm install
```

### Executar localmente

```bash
npm start
```

O site estará disponível em [http://localhost:3000](http://localhost:3000).

### Configuração do Supabase

1. Crie um arquivo `.env` na raiz do projeto usando `.env.example` como base.
2. Preencha as variáveis:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`
   - `REACT_APP_ADMIN_USERNAME`
   - `REACT_APP_ADMIN_EMAIL`
   - `REACT_APP_SECOND_ADMIN_USERNAME` (opcional)
   - `REACT_APP_SECOND_ADMIN_EMAIL` (opcional)
3. No Supabase, habilite Auth por e-mail/senha e crie os usuários do casal.
4. Rode o script [supabase/schema_and_policies.sql](supabase/schema_and_policies.sql) no SQL Editor do Supabase.
5. Após rodar o script, adicione os e-mails do casal em `public.admin_access`.

## Área administrativa e RSVP

### Rotas

- /admin/login: login dos noivos
- /admin: painel admin protegido
- /confirmar/:token: RSVP público por convidado

### Organização (painel)

- Visão Geral: métricas e próximos passos.
- Gestão de Convidados: cadastro, edição, status RSVP, links individuais.
- Criar Convites: estúdio de convite digital com preview e envio por WhatsApp.

### Modelo simplificado de convidado

Cada documento em guests usa os campos:

- name
- phone
- rsvp_status (aguardando, confirmado, recusado)
- invite_token
- invited_by
- created_at
- updated_at

### Próximos passos técnicos

- Endurecer políticas RLS no Supabase.
- Exportação de dados no dashboard.
- Integração de envio de links via WhatsApp.

### Observação de segurança

- O RSVP público usa funções RPC seguras por token (`get_guest_public_by_token` e `confirm_guest_rsvp`) em vez de update anônimo direto na tabela.

### Build para produção

```bash
npm run build
```
