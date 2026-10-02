import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'staff';
}

interface AuthContextType {
  isAuthenticated: boolean;
  authLoading: boolean;
  user: AuthUser | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const fetchAndSetUser = async (userId: string, email: string) => {
    const { data: profile, error } = await supabase
      .from('admin_profiles')
      .select('full_name, role, is_active')
      .eq('id', userId)
      .single();

    if (error || !profile || !profile.is_active || profile.role !== 'admin') {
      await supabase.auth.signOut();
      setUser(null);
      return false;
    }

    setUser({
      id: userId,
      email: email,
      name: profile.full_name,
      role: profile.role as 'admin' | 'staff'
    });
    return true;
  };

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          await fetchAndSetUser(session.user.id, session.user.email || '');
        }
      } finally {
        if (mounted) setAuthLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        if (event === 'SIGNED_IN' && session?.user) {
          await fetchAndSetUser(session.user.id, session.user.email || '');
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, pass: string): Promise<boolean> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (error || !data.user) {
      throw new Error(error?.message || 'Erro na autenticação');
    }

    const success = await fetchAndSetUser(data.user.id, data.user.email || '');
    if (!success) {
      throw new Error('Acesso não autorizado ou inativo.');
    }
    return true;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: Boolean(user),
        authLoading,
        user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}