import { createAuthClient } from "better-auth/react";

// No baseURL needed — Better Auth infers it from window.location.origin in the browser,
// which works correctly on any domain (localhost, Railway, or custom domain).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const authClient: ReturnType<typeof createAuthClient> = createAuthClient();

export const { useSession, signIn, signOut, signUp } = authClient;
