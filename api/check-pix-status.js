import { rateLimit, getClientIp } from './_rate-limit.js';

const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;

export default async function handler(req, res) {
  const ALLOWED_ORIGIN = 'https://casamento-ten-rho.vercel.app';
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const ip = getClientIp(req);
  if (!rateLimit(ip, 30, 60000)) {
    return res.status(429).json({ error: 'Muitas requisições. Tente novamente em 1 minuto.' });
  }

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const paymentId = req.query.payment_id;
    if (!paymentId) {
      return res.status(400).json({ error: 'payment_id é obrigatório.' });
    }

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` },
    });

    const mpData = await mpRes.json();
    if (!mpRes.ok) {
      return res.status(mpRes.status).json({ error: mpData.message || 'Erro ao consultar pagamento.' });
    }

    return res.status(200).json({
      status: mpData.status,
      statusDetail: mpData.status_detail,
      approved: mpData.status === 'approved',
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno.' });
  }
}
