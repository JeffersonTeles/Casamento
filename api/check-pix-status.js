const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN || 'APP_USR-3886791216697051-090315-ba3f743dba69715276fd0c52712379a1-1254097619';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
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
