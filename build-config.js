// Gera js/config.js a partir das variáveis de ambiente.
// Usado no build da Vercel para injetar credenciais sem colocá-las no git.
// Uso local: `node build-config.js` ou copie js/config.example.js manualmente.
const fs = require('fs');
const path = require('path');

const env = (keys) => {
  for (const key of keys) {
    if (process.env[key]) return process.env[key];
  }
  return '';
};

const supabaseUrl = env(['REACT_APP_SUPABASE_URL', 'SUPABASE_URL']);
const supabaseAnonKey = env(['REACT_APP_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY']);
const primaryAdminEmail = env(['REACT_APP_ADMIN_EMAIL', 'SUPABASE_ADMIN_EMAIL']);
const secondaryAdminEmail = env(['REACT_APP_SECOND_ADMIN_EMAIL', 'SUPABASE_SECOND_ADMIN_EMAIL']);
const primaryAdminUsername = env(['REACT_APP_ADMIN_USERNAME', 'SUPABASE_ADMIN_USERNAME']);
const secondaryAdminUsername = env(['REACT_APP_SECOND_ADMIN_USERNAME', 'SUPABASE_SECOND_ADMIN_USERNAME']);

const adminEmails = [primaryAdminEmail, secondaryAdminEmail].filter(Boolean);

const adminUsers = [];
for (let i = 0; i < adminEmails.length; i++) {
  const email = adminEmails[i];
  const username = i === 0 ? primaryAdminUsername : secondaryAdminUsername;
  if (!username) continue;
  adminUsers.push({ username, email });
}

const config = {
  supabaseUrl,
  supabaseAnonKey,
  adminEmails,
  adminUsers,
  // Wedding constants (public, not secrets)
  pixKey: '45998378691',
  pixKeys: [
    { name: 'Beatriz', key: '45998378691', formatted: '(45) 99837-8691' },
    { name: 'Jefferson', key: '44999277915', formatted: '(44) 99927-7915' }
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

const output = `// Arquivo gerado automaticamente por build-config.js a partir das variáveis de ambiente.
// Nao edite manualmente. Para rodar localmente, copie js/config.example.js para js/config.js.
window.WEDDING_CONFIG = ${JSON.stringify(config, null, 2)};\n`;

const target = path.join(__dirname, 'js', 'config.js');
fs.writeFileSync(target, output);

console.log('js/config.js gerado com sucesso.');
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('AVISO: Supabase URL/chave anon nao configurados. Configure REACT_APP_SUPABASE_URL e REACT_APP_SUPABASE_ANON_KEY no ambiente da Vercel.');
}
if (adminEmails.length === 0) {
  console.error('ERRO CRITICO DE SEGURANCA: Nenhum email de admin configurado! Acesso ao painel administrativo sera BLOQUEADO.');
  console.error('  Configure REACT_APP_ADMIN_EMAIL e/ou REACT_APP_SECOND_ADMIN_EMAIL nas variaveis de ambiente da Vercel.');
} else {
  console.log(`Admins configurados (${adminEmails.length}): ${adminEmails.join(', ')}`);
}
