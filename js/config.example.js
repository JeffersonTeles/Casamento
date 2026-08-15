// ============================================================
// TEMPLATE DE CONFIGURAÇÃO — NÃO PREENCHA ESTE ARQUIVO
// ============================================================
// Copie para js/config.js e preencha com seus valores reais.
// js/config.js está no .gitignore e NUNCA deve ir para o git.
//
// Em produção (Vercel), o arquivo js/config.js é gerado
// automaticamente a partir das variáveis de ambiente pelo
// script `node build-config.js` (roda no build).
//
// Variáveis de ambiente usadas:
//   REACT_APP_SUPABASE_URL      (ou SUPABASE_URL)
//   REACT_APP_SUPABASE_ANON_KEY (ou SUPABASE_ANON_KEY)
//   REACT_APP_ADMIN_EMAIL       (e-mail do noivo)
//   REACT_APP_SECOND_ADMIN_EMAIL (e-mail da noiva)
// ============================================================
window.WEDDING_CONFIG = {
  supabaseUrl: 'https://SEU-PROJETO.supabase.co',
  supabaseAnonKey: 'sua-chave-anon-publica',
  adminEmails: ['email-do-noivo@exemplo.com', 'email-da-noiva@exemplo.com'],
  adminUsers: [
    { username: 'jefferson', email: 'email-do-noivo@exemplo.com' },
    { username: 'beatriz', email: 'email-da-noiva@exemplo.com' },
  ],
};
