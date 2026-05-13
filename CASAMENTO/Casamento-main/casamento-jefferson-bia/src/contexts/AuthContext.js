import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

const primaryAdminEmail = process.env.REACT_APP_ADMIN_EMAIL;
const secondaryAdminEmail = process.env.REACT_APP_SECOND_ADMIN_EMAIL || primaryAdminEmail;

const adminUsers = [
  {
    username: process.env.REACT_APP_ADMIN_USERNAME || 'Deus',
    email: primaryAdminEmail,
  },
  {
    username: process.env.REACT_APP_SECOND_ADMIN_USERNAME || 'Deus',
    email: secondaryAdminEmail,
  },
].filter((item) => item.email);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();

      if (isMounted) {
        setUser(data.session?.user || null);
        setLoading(false);
      }
    }

    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    login: async (username, password) => {
      const normalized = username.trim().toLowerCase();
      const matchedAdmin = adminUsers.find((item) => item.username.trim().toLowerCase() === normalized);

      if (!matchedAdmin) {
        return { data: null, error: new Error('Invalid login credentials') };
      }

      if (!matchedAdmin.email) {
        return { data: null, error: new Error('Admin email not configured') };
      }

      return supabase.auth.signInWithPassword({
        email: matchedAdmin.email,
        password,
      });
    },
    logout: () => supabase.auth.signOut(),
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  }

  return context;
};