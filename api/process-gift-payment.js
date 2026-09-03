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
    const {
      // Dados do Brick (formData do onSubmit)
      token,
      issuer_id,
      payment_method_id,
      transaction_amount,
      installments,
      payer,
      payment_type_id,
      // Dados extras da nossa aplicação
      preferenceId,
      contributionId,
      itemId,
      itemName,
      donorName,
      donorMessage,
      amount,
    } = req.body || {};

    const finalAmount = parseFloat(transaction_amount || amount);
    if (!finalAmount || isNaN(finalAmount) || finalAmount <= 0) {
      return res.status(400).json({ error: 'Valor inválido.' });
    }

    // Monta payload de pagamento para a API do MP
    const mpPayload = {
      transaction_amount: finalAmount,
      description: `Presente de Casamento: ${(itemName || 'Presente').slice(0, 100)}`,
      payment_method_id,
      payer: {
        email: payer?.email || 'convidado@casamentojb.com',
        identification: payer?.identification,
        first_name: (donorName || 'Convidado').split(' ')[0],
        last_name: (donorName || '').split(' ').slice(1).join(' ') || 'Convidado',
      },
      metadata: {
        contribution_id: contributionId,
        item_id: itemId,
        donor_name: donorName,
        donor_message: donorMessage,
      },
    };

    // Campos específicos para cartão de crédito/débito
    if (token) mpPayload.token = token;
    if (issuer_id) mpPayload.issuer_id = issuer_id;
    if (installments) mpPayload.installments = parseInt(installments) || 1;
    if (payment_type_id) mpPayload.payment_type_id = payment_type_id;

    // Chama a API de Pagamentos do Mercado Pago
    const mpRes = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `gift-${contributionId || Date.now()}`,
      },
      body: JSON.stringify(mpPayload),
    });

    const mpData = await mpRes.json();

    if (!mpRes.ok) {
      console.error('Erro MP payment:', mpData);
      return res.status(500).json({ error: mpData.message || mpData.cause?.[0]?.description || 'Erro ao processar pagamento.' });
    }

    const isApproved = mpData.status === 'approved';
    const isPending = mpData.status === 'in_process' || mpData.status === 'pending';

    // Atualiza o Supabase
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Atualiza gift_contributions
      if (contributionId) {
        await supabase
          .from('gift_contributions')
          .update({
            payment_status: mpData.status,
            mp_payment_id: String(mpData.id),
          })
          .eq('id', contributionId);
      }

      // Se aprovado, marca o item como presenteado
      if (isApproved && itemId && !['cota-lua-de-mel', 'jantar-romantico'].includes(itemId)) {
        await supabase
          .from('home_items')
          .update({
            is_gifted: true,
            gifted_by: donorName,
            gifted_at: new Date().toISOString(),
            gifted_message: donorMessage || null,
            status: 'temos',
          })
          .eq('id', itemId);
      }
    }

    return res.status(200).json({
      success: true,
      status: mpData.status,
      approved: isApproved,
      pending: isPending,
      paymentId: mpData.id,
    });
  } catch (err) {
    console.error('Erro process-gift-payment:', err);
    return res.status(500).json({ error: err.message || 'Erro interno no servidor' });
  }
}
