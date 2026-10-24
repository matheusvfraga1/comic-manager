import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  return <AuthContext.Provider value={session}>{children}</AuthContext.Provider>;
}

// undefined = carregando, null = deslogado
export const useSession = () => useContext(AuthContext);
export const useUser = () => useContext(AuthContext)?.user ?? null;
