import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_MINUTES = 10;
const LOCK_STORAGE_KEY = 'wedding_admin_lock_state';

function loadLockState() {
  try {
    const raw = localStorage.getItem(LOCK_STORAGE_KEY);
    if (!raw) return { attempts: 0, lockedUntil: null };
    const parsed = JSON.parse(raw);
    return {
      attempts: Number(parsed.attempts || 0),
      lockedUntil: parsed.lockedUntil || null,
    };
  } catch {
    return { attempts: 0, lockedUntil: null };
  }
}

function saveLockState(nextState) {
  localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(nextState));
}

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockState, setLockState] = useState(loadLockState);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const lockedUntilMs = useMemo(
    () => (lockState.lockedUntil ? new Date(lockState.lockedUntil).getTime() : null),
    [lockState.lockedUntil]
  );

  const isLocked = Boolean(lockedUntilMs && lockedUntilMs > now);
  const secondsRemaining = isLocked ? Math.ceil((lockedUntilMs - now) / 1000) : 0;

  if (user) {
    return <Navigate to="/admin" replace />;
  }

  const from = location.state?.from?.pathname || '/admin';
  const isRestrictedAttempt = Boolean(location.state?.restricted);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (isLocked) {
      setError(`Acesso temporariamente bloqueado. Tente novamente em ${secondsRemaining}s.`);
      return;
    }

    setLoading(true);

    try {
      const { error: authError } = await login(form.username.trim(), form.password);

      if (authError) {
        throw authError;
      }

      const resetState = { attempts: 0, lockedUntil: null };
      saveLockState(resetState);
      setLockState(resetState);
      navigate(from, { replace: true });
    } catch (authError) {
      const message = authError?.message || '';

      const nextAttempts = lockState.attempts + 1;
      const shouldLock = nextAttempts >= MAX_LOGIN_ATTEMPTS;
      const nextState = {
        attempts: shouldLock ? 0 : nextAttempts,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString() : null,
      };
      saveLockState(nextState);
      setLockState(nextState);

      if (message.includes('Invalid login credentials')) {
        setError('Usuário ou senha inválidos.');
      } else if (message.includes('Admin email not configured')) {
        setError('Configuração incompleta. Defina REACT_APP_ADMIN_EMAIL no arquivo .env.');
      } else if (message.includes('Email not confirmed')) {
        setError('Seu e-mail ainda não foi confirmado no Supabase Auth.');
      } else if (message.toLowerCase().includes('failed to fetch')) {
        setError('Não foi possível conectar ao Supabase. Verifique o arquivo .env e reinicie o servidor.');
      } else {
        setError('Não foi possível entrar. Verifique usuário, senha e configuração do Supabase.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-800">Área administrativa</h1>
        <p className="text-sm text-slate-500 mt-1">Acesso restrito aos noivos.</p>
        <p className="mt-2 text-xs text-slate-500">Somente usuários autorizados conseguem entrar.</p>

        {isRestrictedAttempt && (
          <p className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Acesso restrito. Entre com a conta do casal para continuar.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            type="text"
            required
            placeholder="Usuário"
            value={form.username}
            onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
          <input
            type="password"
            required
            placeholder="Senha"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading || isLocked}
            className="w-full rounded-lg bg-slate-900 text-white py-2 font-medium hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          {isLocked && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Tentativas excedidas. Aguarde {secondsRemaining}s para tentar novamente.
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;