import { createClient } from '@supabase/supabase-js';

const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN || 'APP_USR-3886791216697051-090315-ba3f743dba69715276fd0c52712379a1-1254097619';
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL || 'https://ysadooisujkjindusjbu.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { itemId, itemName, itemPrice, donorName, donorMessage, donorEmail, donorCpf } = req.body || {};

    const price = parseFloat(itemPrice);
    if (!itemName || isNaN(price) || price <= 0) {
      return res.status(400).json({ error: 'Dados inválidos.' });
    }

    const donor = (donorName || 'Anônimo').trim();
    const message = (donorMessage || '').trim();
    const email = (donorEmail || '').trim();
    const cpf = (donorCpf || '').replace(/\D/g, '');

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
          amount: price,
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
    const notificationUrl = `${protocol}://${host}/api/mp-webhook`;

    const payer = {
      email: email || `convidado${Date.now()}@casamentojb.com`,
      first_name: donor.split(' ')[0] || 'Convidado',
      last_name: donor.split(' ').slice(1).join(' ') || 'Convidado',
    };
    if (cpf && cpf.length === 11) {
      payer.identification = { type: 'CPF', number: cpf };
    }

    const mpPayload = {
      transaction_amount: Math.round(price * 100) / 100,
      description: `Presente de Casamento: ${itemName.slice(0, 100)}`.slice(0, 99),
      payment_method_id: 'pix',
      payer,
      notification_url: notificationUrl,
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
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `pix-gift-${contributionId || Date.now()}`,
      },
      body: JSON.stringify(mpPayload),
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok) {
      console.error('Erro MP pix:', mpData);
      return res.status(500).json({ error: mpData.message || mpData.cause?.[0]?.description || 'Erro ao gerar PIX.' });
    }

    const tx = mpData.point_of_interaction?.transaction_data || {};
    const qrCode = tx.qr_code;
    const qrCodeBase64 = tx.qr_code_base64;

    if (contributionId && mpData.id && supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase
        .from('gift_contributions')
        .update({ mp_payment_id: String(mpData.id) })
        .eq('id', contributionId);
    }

    return res.status(200).json({
      success: true,
      paymentId: mpData.id,
      status: mpData.status,
      qrCode,
      qrCodeBase64,
      ticketUrl: tx.ticket_url,
      contributionId,
      expirationDate: tx.expiration_date,
    });
  } catch (err) {
    console.error('Erro create-pix-qr:', err);
    return res.status(500).json({ error: err.message || 'Erro interno no servidor' });
  }
}
