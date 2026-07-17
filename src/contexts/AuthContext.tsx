import * as React from 'react';
import { supabase } from '../lib/supabase';
import { AuthenticatedUser, UserCargo } from '../types/auth';
import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';

type AuthContextValue = {
  authUser: AuthenticatedUser | null;
  isInitializing: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

/**
 * Decodifica o cargo diretamente do payload do JWT (base64url).
 * O objeto session.user do Supabase pode não refletir o app_metadata
 * injetado pelo custom_access_token_hook. Esta função lê o token raw.
 */
function decodeJwtCargo(accessToken: string): UserCargo {
  try {
    const base64Payload = accessToken
      .split('.')[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const payload = JSON.parse(atob(base64Payload));
    const cargo = payload?.app_metadata?.cargo;
    if (cargo === 'admin' || cargo === 'operador') return cargo;
    return 'operador';
  } catch {
    return 'operador';
  }
}

function buildAuthUser(session: { user: any; access_token: string } | null): AuthenticatedUser | null {
  if (!session?.user || !session?.access_token) return null;
  const cargo = decodeJwtCargo(session.access_token);
  const nome = session.user.user_metadata?.full_name ?? 'Usuário';
  return { id: session.user.id, email: session.user.email, nome, cargo };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser] = React.useState<AuthenticatedUser | null>(null);
  const [isInitializing, setIsInitializing] = React.useState(true);

  React.useEffect(() => {
    let appUrlListener: { remove: () => void } | null = null;

    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) throw new Error(`Auth storage error: ${error.message}`);
        setAuthUser(buildAuthUser(session));
      })
      .catch((err: Error) => {
        console.error('AuthContext: falha ao ler sessão:', err.message);
        setAuthUser(null);
      })
      .finally(() => {
        setIsInitializing(false);
        if (Capacitor.isNativePlatform()) {
          SplashScreen.hide().catch((err) => {
            console.error('Erro ao fechar Splash Screen:', err);
          });
        }
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(buildAuthUser(session));
    });

    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('appUrlOpen', async (event) => {
        const url = event.url;
        if (!url.startsWith('inventoryapp://login-callback')) return;

        await Browser.close();

        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search || urlObj.hash.replace('#', '?'));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (!accessToken || !refreshToken) return;

        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (error) console.error('AuthContext: erro ao setar sessão OAuth:', error.message);
        // onAuthStateChange dispara automaticamente e atualiza authUser
      }).then((listener) => {
        appUrlListener = listener;
      });
    }

    return () => {
      subscription.unsubscribe();
      if (appUrlListener) appUrlListener.remove();
    };
  }, []);

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
  }, []);

  const value = React.useMemo(
    () => ({ authUser, isInitializing, signOut }),
    [authUser, isInitializing, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
