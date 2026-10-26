import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from '@react-native-firebase/auth';
import type { AuthUser } from '@/features/auth/domain/auth.types';

/**
 * The only file that talks to Firebase Auth. The rest of the app sees AuthUser,
 * so Firebase details never leak into screens. Errors are thrown unchanged;
 * screens turn them into messages with mapAuthError.
 */

const toAuthUser = (user: User): AuthUser => ({
  uid: user.uid,
  email: user.email,
  displayName: user.displayName,
});

/** Calls back with the saved user on app start, and again on sign-in and sign-out. */
export function subscribeToAuth(listener: (user: AuthUser | null) => void): () => void {
  return onAuthStateChanged(getAuth(), (user) => listener(user ? toAuthUser(user) : null));
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(getAuth(), email, password);
}

export async function signUpWithEmail(
  name: string,
  email: string,
  password: string,
): Promise<AuthUser> {
  const { user } = await createUserWithEmailAndPassword(getAuth(), email, password);
  const displayName = name.trim().replace(/\s+/g, ' ');

  // The account already exists at this point. If saving the name fails (e.g. the connection
  // dropped) the person is still signed in, so do not report the whole sign-up as failed.
  try {
    await updateProfile(user, { displayName });
    return { ...toAuthUser(user), displayName };
  } catch {
    return toAuthUser(user);
  }
}

export function signOutUser(): Promise<void> {
  return signOut(getAuth());
}
