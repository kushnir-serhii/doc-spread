import { createRemoteJWKSet, jwtVerify } from 'jose'

export class AuthError extends Error {}

export interface AuthContext {
  /** Supabase user id (the token's `sub`). */
  userId: string
}

/** Verifies Supabase access tokens against the project's public keys (asymmetric signing). */
export const createVerifier = (supabaseUrl: string, jwksUrl: string) => {
  const jwks = createRemoteJWKSet(new URL(jwksUrl))
  const issuer = `${supabaseUrl}/auth/v1`
  return async (authorizationHeader: string | undefined): Promise<AuthContext> => {
    const match = /^Bearer\s+(\S+)$/i.exec(authorizationHeader ?? '')
    if (!match?.[1]) throw new AuthError('missing token')
    try {
      const { payload } = await jwtVerify(match[1], jwks, { issuer, audience: 'authenticated' })
      if (!payload.sub) throw new AuthError('token has no subject')
      return { userId: payload.sub }
    } catch (error) {
      if (error instanceof AuthError) throw error
      // jose errors name the reason (expired, bad signature ...) and never contain the token.
      throw new AuthError(error instanceof Error ? error.name : 'invalid token')
    }
  }
}
