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

const adminEmails = [primaryAdminEmail, secondaryAdminEmail].filter(Boolean);

const config = {
  supabaseUrl,
  supabaseAnonKey,
  adminEmails,
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
