import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

const GuestRsvp = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [guest, setGuest] = useState(null);

  useEffect(() => {
    async function loadGuest() {
      try {
        const { data, error } = await supabase
          .rpc('get_guest_public_by_token', { p_invite_token: token });

        const guestRow = Array.isArray(data) ? data[0] : null;

        if (error || !guestRow) {
          setMessage('Convite não encontrado.');
          setLoading(false);
          return;
        }

        setGuest(guestRow);
      } catch {
        setMessage('Erro ao carregar convite.');
      } finally {
        setLoading(false);
      }
    }

    loadGuest();
  }, [token]);

  async function confirmRsvp(rsvpStatus) {
    if (!guest?.id) return;

    setSaving(true);
    setMessage('');

    try {
      const { data, error } = await supabase
        .rpc('confirm_guest_rsvp', {
          p_invite_token: token,
          p_rsvp_status: rsvpStatus,
        });

      if (error || !data) {
        setMessage('Convite não encontrado.');
        setSaving(false);
        return;
      }

      setGuest((prev) => ({ ...prev, rsvp_status: rsvpStatus }));
      setMessage(rsvpStatus === 'confirmado' ? 'Presença confirmada. Obrigado!' : 'Resposta registrada. Obrigado!');
    } catch {
      setMessage('Não foi possível salvar sua resposta agora.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-rose-50 flex items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-2xl bg-white border border-rose-100 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-vinho">Confirmação de presença</h1>

        {loading && <p className="mt-4 text-sm text-slate-500">Carregando seu convite...</p>}
        {!loading && !guest && <p className="mt-4 text-sm text-red-600">{message || 'Convite inválido.'}</p>}

        {!loading && guest && (
          <div className="mt-4 space-y-4">
            <p className="text-slate-700">
              Olá, <span className="font-semibold">{guest.name}</span>.
            </p>
            <p className="text-sm text-slate-600">Você poderá alterar sua resposta a qualquer momento usando este mesmo link.</p>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => confirmRsvp('confirmado')}
                disabled={saving}
                className="rounded-lg bg-green-700 text-white px-4 py-2 text-sm font-medium hover:bg-green-600 disabled:opacity-60"
              >
                Vou comparecer
              </button>
              <button
                onClick={() => confirmRsvp('recusado')}
                disabled={saving}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60"
              >
                Não poderei ir
              </button>
            </div>

            <p className="text-sm text-slate-500">
              Status atual: <span className="font-medium text-slate-700">{guest.rsvp_status || 'aguardando'}</span>
            </p>

            {message && <p className="text-sm text-slate-700">{message}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

export default GuestRsvp;