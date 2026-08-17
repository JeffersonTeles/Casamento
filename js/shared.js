// js/shared.js — Configurações compartilhadas entre todas as páginas
// Inicialização Supabase e utilitários

// === SUPABASE CLIENT ===
const WEDDING_CONFIG = window.WEDDING_CONFIG || {};
const SUPABASE_URL = WEDDING_CONFIG.supabaseUrl || '';
const SUPABASE_KEY = WEDDING_CONFIG.supabaseAnonKey || '';
const supabaseClient = (typeof supabase !== 'undefined')
  ? supabase.createClient(SUPABASE_URL || 'https://placeholder.supabase.co', SUPABASE_KEY || 'public-anon-placeholder')
  : null;

// === UTILITÁRIOS ===
const NTFY_TOPIC = 'casamento-jefferson-bia-notificacoes';

async function sendPushNotification(name, status, plusOnes, message) {
  if (!NTFY_TOPIC) return;
  const body = `Convidado: ${name}\nResposta: ${status === 'confirmado' ? 'Confirmado!' : 'Não vai'}\nAcompanhantes: ${plusOnes}\nRecado: ${message}`;
  try {
    await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: 'POST',
      body,
        headers: { 'Title': `Novo RSVP: ${name}`, 'Priority': 'high', 'Tags': status === 'confirmado' ? 'tada,ring' : 'pensive' }
    });
  } catch (err) { console.error('Erro notificação:', err); }
}

async function logAccess(guestId) {
  if (!supabaseClient) return;
  try {
    await supabaseClient.from('rsvp_access_logs').insert([{
      guest_id: guestId,
      access_time: new Date().toISOString(),
    }]);
  } catch (err) { console.error('Error logging access:', err); }
}
