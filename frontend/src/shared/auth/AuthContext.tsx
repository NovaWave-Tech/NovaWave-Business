import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { clearAuth, getUser, type AuthUser } from '../services/http';

type AuthContextValue = {
  user: AuthUser | null;
  signOut: () => void;
  /** Verifica permissao "modulo:acao"; admin ("*") tem acesso total. */
  can: (permission: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user] = useState<AuthUser | null>(() => getUser());
  const navigate = useNavigate();

  const signOut = useCallback(() => {
    clearAuth();
    navigate('/login', { replace: true });
  }, [navigate]);

  const can = useCallback(
    (permission: string) => {
      const permissions = user?.permissions;
      // Sessoes antigas (sem permissoes no payload) mantem acesso visual;
      // o backend continua negando com 403 quando nao autorizado.
      if (!permissions) return true;
      return permissions.includes('*') || permissions.includes(permission);
    },
    [user]
  );

  const value = useMemo(() => ({ user, signOut, can }), [user, signOut, can]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }

  return context;
}
