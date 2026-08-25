// js/shared.js — Configurações compartilhadas entre todas as páginas
// Inicialização Supabase e utilitários

// === SUPABASE CLIENT ===
const WEDDING_CONFIG = window.WEDDING_CONFIG || {};
const SUPABASE_URL = WEDDING_CONFIG.supabaseUrl || '';
const SUPABASE_KEY = WEDDING_CONFIG.supabaseAnonKey || '';
const supabaseClient = (typeof supabase !== 'undefined' && SUPABASE_URL && SUPABASE_KEY)
  ? supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

// === CONSTANTS ===
const NTFY_TOPIC = 'casamento-jefferson-bia-notificacoes';
const RSVP_RATE_LIMIT_MS = 60000;
const TOAST_DURATION_MS = 3000;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// === UTILITIES ===
function setButtonLoading(btn, isLoading, originalText = '') {
  if (!btn) return;
  if (isLoading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.disabled = true;
    btn.style.opacity = '0.7';
    btn.style.pointerEvents = 'none';
    btn.innerHTML = `<svg class="animate-spin h-5 w-5 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;
  } else {
    btn.disabled = false;
    btn.style.opacity = '';
    btn.style.pointerEvents = '';
    btn.innerHTML = originalText || btn.dataset.originalText || 'Salvar';
  }
}

function parseMoney(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  // Remove tudo que não for dígito ou vírgula
  const cleaned = String(val).replace(/[^\d,]/g, '');
  // Substitui vírgula por ponto
  const parsed = parseFloat(cleaned.replace(',', '.'));
  return isNaN(parsed) ? 0 : parsed;
}

function getConfig(key, fallback) {
  return WEDDING_CONFIG[key] ?? fallback;
}

function getPixKey() {
  return getConfig('pixKey', '44999277915');
}

function getVenue() {
  return getConfig('venue', { name: 'Capela São Maximiliano Maria Kolbe', address: 'R. Frei Maximiliano kolbe, 970 — Cascavel, PR', query: 'Capela+S%C3%A3o+Maximiliano+Maria+Kolbe+Cascavel+PR' });
}

function getWeddingDate() {
  const val = getConfig('weddingDate', '2027-02-06T08:00:00');
  return val instanceof Date ? val : new Date(val);
}

function getBudgetDefault() {
  return getConfig('budgetDefault', 50000);
}

function normalizeOwner(owner) {
  if (!owner) return '';
  return owner === 'Beatriz' ? 'Bia' : owner;
}

// === CLIPBOARD ===
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}

// === TOAST (shared) ===
function showToastGlobal(msg, type = 'info') {
  let t = document.getElementById('shared-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'shared-toast';
    t.style.cssText = 'position:fixed;bottom:1.5rem;left:50%;transform:translateX(-50%) translateY(20px);padding:0.625rem 1.25rem;border-radius:9999px;color:white;font-size:0.875rem;font-weight:600;box-shadow:0 10px 25px rgba(0,0,0,0.2);z-index:9999;opacity:0;transition:all 0.3s;pointer-events:none;white-space:nowrap;';
    document.body.appendChild(t);
  }
  const colors = { success: '#10b981', error: '#ef4444', info: '#1a1a2e' };
  t.textContent = msg;
  t.style.background = colors[type] || colors.info;
  requestAnimationFrame(() => {
    t.style.opacity = '1';
    t.style.transform = 'translateX(-50%) translateY(0)';
  });
  clearTimeout(t._timer);
  t._timer = setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(-50%) translateY(20px)';
  }, TOAST_DURATION_MS);
}

// === NOTIFICATIONS ===
async function sendPushNotification(name, status, plusOnes, message) {
  if (!NTFY_TOPIC) return;
  const safeName = String(name || '').slice(0, 100);
  const safeMsg = String(message || '').slice(0, 500);
  const body = `Convidado: ${safeName}\nResposta: ${status === 'confirmado' ? 'Confirmado!' : 'Não vai'}\nAcompanhantes: ${plusOnes}\nRecado: ${safeMsg}`;
  try {
    await fetch(`https://ntfy.sh/${NTFY_TOPIC}`, {
      method: 'POST',
      body,
      headers: { 'Title': `Novo RSVP: ${safeName}`, 'Priority': 'high', 'Tags': status === 'confirmado' ? 'tada,ring' : 'pensive' }
    });
  } catch (err) { console.warn('Notificação push falhou:', err); }
}

async function logAccess(guestId) {
  if (!supabaseClient) return;
  try {
    await supabaseClient.from('rsvp_access_logs').insert([{
      guest_id: guestId,
      access_time: new Date().toISOString(),
    }]);
  } catch (err) { console.warn('Log de acesso falhou:', err); }
}

// === GUEST PERSON COUNT ===
function getGuestPersonCount(g) {
  if (!g) return 0;
  const partnerCount = String(g.partner_name || '').trim() ? 1 : 0;
  const plusOnes = Number(g.plus_ones || 0);
  return 1 + partnerCount + plusOnes;
}

// === RSVP SHARED ===
function checkRsvpRateLimit(token) {
  const rateKey = `rsvp_rate_${token}`;
  const lastSubmit = parseInt(localStorage.getItem(rateKey) || '0');
  return Date.now() - lastSubmit >= RSVP_RATE_LIMIT_MS;
}

function setRsvpRateLimit(token) {
  const rateKey = `rsvp_rate_${token}`;
  localStorage.setItem(rateKey, String(Date.now()));
}

// === SCROLL REVEAL (IntersectionObserver) ===
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('active');
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}
