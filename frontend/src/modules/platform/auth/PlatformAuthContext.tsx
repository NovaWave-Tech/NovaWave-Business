import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  platformApi,
  platformSession,
  type PlatformUser,
} from '../services/platformApi';

type ContextValue = {
  user: PlatformUser | null;
  setUser: (user: PlatformUser) => void;
  signOut: () => Promise<void>;
};

const PlatformAuthContext = createContext<ContextValue | null>(null);

export function PlatformAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PlatformUser | null>(() =>
    platformSession.user()
  );
  const navigate = useNavigate();

  const value = useMemo(
    () => ({
      user,
      setUser,
      signOut: async () => {
        const refreshToken = platformSession.refreshToken();
        try {
          if (refreshToken)
            await platformApi.post('/auth/logout', {
              refresh_token: refreshToken,
            });
        } finally {
          platformSession.clear();
          setUser(null);
          navigate('/platform/login', { replace: true });
        }
      },
    }),
    [navigate, user]
  );

  return (
    <PlatformAuthContext.Provider value={value}>
      {children}
    </PlatformAuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePlatformAuth() {
  const context = useContext(PlatformAuthContext);
  if (!context)
    throw new Error(
      'usePlatformAuth deve estar dentro de PlatformAuthProvider'
    );
  return context;
}
