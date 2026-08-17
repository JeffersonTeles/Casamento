// js/sanitize.js — Utilitário de sanitização XSS
// Usado em todas as páginas que renderizam conteúdo do usuário via innerHTML

function sanitizeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function sanitizeAttr(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/'/g, '&#39;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function sanitizeURL(str) {
  if (!str) return '';
  const url = String(str).trim();
  if (/^https?:\/\//i.test(url)) return url;
  return '';
}
