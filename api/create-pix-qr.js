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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { itemId, itemName, itemPrice, donorName, donorMessage } = req.body || {};

    const price = parseFloat(itemPrice);
    if (!itemName || isNaN(price) || price <= 0) {
      return res.status(400).json({ error: 'Dados do presente inválidos ou valor menor/igual a zero.' });
    }

    const donor = (donorName || 'Convidado').trim();
    const message = (donorMessage || '').trim();
    const amount = Math.round(price * 100) / 100;

    let contributionId = null;
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase
        .from('gift_contributions')
        .insert([{
          item_id: itemId || null,
          item_name: itemName,
          donor_name: donor,
          donor_message: message,
          amount,
          payment_status: 'pending',
          payment_method: 'pix',
        }])
        .select('id')
        .single();

      if (!error && data?.id) {
        contributionId = data.id;
      }
    }

    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'casamento-ten-rho.vercel.app';
    const baseUrl = `${protocol}://${host}`;

    const mpPayload = {
      transaction_amount: amount,
      description: `Presente de Casamento: ${itemName.slice(0, 100)}`,
      payment_method_id: 'pix',
      payer: {
        email: 'convidado@casamentojb.com',
        first_name: donor.split(' ')[0] || 'Convidado',
        last_name: donor.split(' ').slice(1).join(' ') || 'Convidado',
      },
      notification_url: `${baseUrl}/api/mp-webhook`,
      metadata: {
        contribution_id: contributionId,
        item_id: itemId || null,
        donor_name: donor,
        donor_message: message,
      },
    };

    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `******
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `pix-${contributionId || Date.now()}`,
      },
      body: JSON.stringify(mpPayload),
    });

    const mpRaw = await mpRes.text();
    const mpData = parseJsonSafe(mpRaw);

    if (!mpRes.ok || !mpData) {
      const messageError = mpData?.message || 'Erro ao gerar cobrança PIX no Mercado Pago.';
      return res.status(500).json({ error: messageError });
    }

    const qrCode = mpData?.point_of_interaction?.transaction_data?.qr_code;
    const qrCodeBase64 = mpData?.point_of_interaction?.transaction_data?.qr_code_base64;
    const paymentId = mpData?.id;

    if (!qrCode || !qrCodeBase64 || !paymentId) {
      return res.status(500).json({ error: 'Não foi possível obter os dados do QR Code PIX.' });
    }

    if (contributionId && supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase
        .from('gift_contributions')
        .update({
          mp_payment_id: String(paymentId),
          payment_status: mpData.status || 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', contributionId);
    }

    return res.status(200).json({
      success: true,
      status: mpData.status,
      paymentId,
      contributionId,
      qrCode,
      qrCodeBase64,
    });
  } catch (err) {
    console.error('Erro create-pix-qr:', err);
    return res.status(500).json({ error: err.message || 'Erro interno no servidor' });
  }
}
