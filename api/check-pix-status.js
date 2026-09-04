import { createClient } from '@supabase/supabase-js';

const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN || 'APP_USR-3886791216697051-090315-ba3f743dba69715276fd0c52712379a1-1254097619';
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL || 'https://ysadooisujkjindusjbu.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

function parseJsonSafe(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const paymentId = req.query?.payment_id;
  if (!paymentId) {
    return res.status(400).json({ error: 'payment_id é obrigatório.' });
  }

  try {
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `******
      },
    });

    const mpRaw = await mpRes.text();
    const mpData = parseJsonSafe(mpRaw);

    if (!mpRes.ok || !mpData) {
      return res.status(500).json({ error: mpData?.message || 'Erro ao consultar status do PIX.' });
    }

    const status = mpData.status || 'unknown';
    const metadata = mpData.metadata || {};
    const contributionId = metadata.contribution_id;
    const itemId = metadata.item_id;
    const donorName = metadata.donor_name || mpData.payer?.first_name || 'Convidado';
    const donorMessage = metadata.donor_message || '';

    if (supabaseUrl && supabaseKey && contributionId) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase
        .from('gift_contributions')
        .update({
          payment_status: status,
          mp_payment_id: String(mpData.id),
          payment_method: mpData.payment_method_id || 'pix',
          updated_at: new Date().toISOString(),
        })
        .eq('id', contributionId);

      if (status === 'approved' && itemId && !['cota-lua-de-mel', 'jantar-romantico'].includes(itemId)) {
        await supabase
          .from('home_items')
          .update({
            is_gifted: true,
            status: 'temos',
            gifted_by: donorName,
            gifted_at: new Date().toISOString(),
            gifted_message: donorMessage || null,
          })
          .eq('id', itemId);
      }
    }

    return res.status(200).json({
      success: true,
      status,
      paymentId: mpData.id,
      statusDetail: mpData.status_detail || null,
    });
  } catch (err) {
    console.error('Erro check-pix-status:', err);
    return res.status(500).json({ error: err.message || 'Erro interno no servidor' });
  }
}
