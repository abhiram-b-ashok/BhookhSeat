/** What the app knows about the signed-in person. Deliberately not a Firebase type. */
export type AuthUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
};

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';
