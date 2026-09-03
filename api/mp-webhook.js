import { createClient } from '@supabase/supabase-js';

const MP_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN || 'APP_USR-3886791216697051-090315-ba3f743dba69715276fd0c52712379a1-1254097619';
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL || 'https://ysadooisujkjindusjbu.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Mercado Pago pode enviar GET ou POST
  const query = req.query || {};
  const body = req.body || {};

  const type = body.type || query.type || body.topic || query.topic;
  const paymentId = body.data?.id || body.id || query['data.id'] || query.id;

  console.log('[MP Webhook] Notificação recebida:', { type, paymentId, action: body.action });

  // Se for notificação de pagamento
  if (paymentId && (type === 'payment' || body.action?.startsWith('payment') || !type)) {
    try {
      const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        },
      });

      if (!mpRes.ok) {
        console.error('[MP Webhook] Erro ao buscar pagamento no MP:', await mpRes.text());
        return res.status(200).json({ received: true });
      }

      const payment = await mpRes.json();
      console.log('[MP Webhook] Status do pagamento:', payment.id, payment.status, payment.status_detail);

      if (payment.status === 'approved') {
        const metadata = payment.metadata || {};
        const contributionId = metadata.contribution_id;
        const itemId = metadata.item_id;
        const donorName = metadata.donor_name || payment.payer?.first_name || 'Convidado';
        const donorMessage = metadata.donor_message || '';
        const amount = payment.transaction_amount;

        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey);

          // 1. Atualizar ou inserir na tabela gift_contributions
          if (contributionId) {
            await supabase
              .from('gift_contributions')
              .update({
                payment_status: 'approved',
                mp_payment_id: String(payment.id),
                payment_method: payment.payment_method_id || 'mercadopago',
                updated_at: new Date().toISOString(),
              })
              .eq('id', contributionId);
          } else {
            await supabase
              .from('gift_contributions')
              .insert([{
                item_id: itemId || null,
                item_name: payment.description || 'Presente de Casamento',
                donor_name: donorName,
                donor_message: donorMessage,
                amount: amount || 0,
                payment_status: 'approved',
                payment_method: payment.payment_method_id || 'mercadopago',
                mp_payment_id: String(payment.id),
              }]);
          }

          // 2. Se for um item da casa específico, marcar como presenteado!
          if (itemId && itemId !== 'gift-custom') {
            await supabase
              .from('home_items')
              .update({
                is_gifted: true,
                status: 'temos',
                gifted_by: donorName,
                gifted_at: new Date().toISOString(),
                gifted_message: donorMessage,
              })
              .eq('id', itemId);
            
            console.log(`[MP Webhook] Item ${itemId} marcado com sucesso como presenteado por ${donorName}!`);
          }
        }
      }
    } catch (err) {
      console.error('[MP Webhook] Erro ao processar:', err);
    }
  }

  // Sempre responder 200 ao Mercado Pago
  return res.status(200).json({ received: true });
}
