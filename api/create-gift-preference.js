import { createClient } from '@supabase/supabase-js';

const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN || 'APP_USR-3886791216697051-090315-ba3f743dba69715276fd0c52712379a1-1254097619';
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL || 'https://ysadooisujkjindusjbu.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { itemId, itemName, itemPrice, donorName, donorMessage } = req.body || {};

    const price = parseFloat(itemPrice);
    if (!itemName || isNaN(price) || price <= 0) {
      return res.status(400).json({ error: 'Dados do presente inválidos ou valor menor/igual a zero.' });
    }

    const donor = (donorName || 'Anônimo').trim();
    const message = (donorMessage || '').trim();

    // 1. Criar registro inicial de contribuição no Supabase
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
          payment_method: 'mercadopago'
        }])
        .select('id')
        .single();

      if (!error && data?.id) {
        contributionId = data.id;
      }
    }

    // 2. Montar URLs de retorno
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'casamento-ten-rho.vercel.app';
    const baseUrl = `${protocol}://${host}`;

    const backUrl = `${baseUrl}/gifts.html?status=success${itemId ? `&item_id=${itemId}` : ''}${contributionId ? `&cid=${contributionId}` : ''}`;
    const notificationUrl = `${baseUrl}/api/mp-webhook`;

    // 3. Chamar a API de Preferências do Mercado Pago
    const mpPayload = {
      items: [
        {
          id: itemId || 'gift-custom',
          title: `Presente de Casamento: ${itemName.slice(0, 100)}`,
          description: `Presente oferecido por ${donor}`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: Math.round(price * 100) / 100,
        }
      ],
      payer: {
        name: donor,
      },
      back_urls: {
        success: backUrl,
        pending: backUrl,
        failure: `${baseUrl}/gifts.html?status=failure`,
      },
      auto_return: 'approved',
      notification_url: notificationUrl,
      metadata: {
        contribution_id: contributionId,
        item_id: itemId || null,
        donor_name: donor,
        donor_message: message,
      },
      statement_descriptor: 'CASAMENTO J&B',
    };

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(mpPayload),
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok) {
      console.error('Erro Mercado Pago preference:', mpData);
      return res.status(500).json({ error: mpData.message || 'Erro ao gerar checkout do Mercado Pago' });
    }

    // 4. Salvar mp_preference_id se tiver contributionId
    if (contributionId && mpData.id && supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase
        .from('gift_contributions')
        .update({ mp_preference_id: mpData.id })
        .eq('id', contributionId);
    }

    return res.status(200).json({
      success: true,
      preferenceId: mpData.id,
      initPoint: mpData.init_point,
      sandboxInitPoint: mpData.sandbox_init_point,
      contributionId,
    });
  } catch (err) {
    console.error('Erro ao criar preferência de presente:', err);
    return res.status(500).json({ error: err.message || 'Erro interno no servidor' });
  }
}
