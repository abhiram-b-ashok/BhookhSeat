import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  signInWithEmail,
  signOutUser,
  signUpWithEmail,
  subscribeToAuth,
} from '@/services/firebase/auth';
import type { AuthStatus, AuthUser } from '../domain/auth.types';

type AuthState = { status: AuthStatus; user: AuthUser | null };

type AuthContextValue = AuthState & {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null });

 useEffect(() => {

  return subscribeToAuth((user) => {
    setState(
      user
        ? { status: 'signedIn', user }
        : { status: 'signedOut', user: null },
    );
  });
}, []);

  const signIn = useCallback((email: string, password: string) => signInWithEmail(email, password), []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const user = await signUpWithEmail(name, email, password);
    // The listener fires as soon as the account is created, before the name is saved,
    // so set the finished user here to make sure the name shows up.
    setState({ status: 'signedIn', user });
  }, []);

  const signOut = useCallback(() => signOutUser(), []);

  const value = useMemo(
    () => ({ ...state, signIn, signUp, signOut }),
    [state, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
}
