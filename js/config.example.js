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

  // Dados centralizados do casamento
  pixKey: '44999277915',
  pixKeys: [
    { name: 'Jefferson', key: '44999277915', formatted: '(44) 99927-7915' },
    { name: 'Beatriz', key: '45998378691', formatted: '(45) 99837-8691' },
  ],
  venue: {
    name: 'Capela São Maximiliano Maria Kolbe',
    address: 'R. Frei Maximiliano kolbe, 970 — Cascavel, PR',
    query: 'Capela+S%C3%A3o+Maximiliano+Maria+Kolbe+Cascavel+PR',
  },
  weddingDate: '2027-02-06T08:00:00',
  rsvpDeadline: '20 de Dezembro de 2026',
  budgetDefault: 50000,
};
