import type { Context, MiddlewareHandler } from 'hono';
import { type JWTPayload, createRemoteJWKSet, jwtVerify } from 'jose';
import type { ApiEnv, AuthClaims } from '../env.js';

type AuthConfig = {
  issuer?: string;
  audience?: string;
};

export type TokenVerifier = (token: string, config: Required<AuthConfig>) => Promise<AuthClaims>;

export type AuthMiddlewareOptions = {
  publicPaths?: string[];
  verifyToken?: TokenVerifier;
};

const jwksByIssuer = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getBearerToken(header: string | undefined): string | null {
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
}

function getAuthConfig(c: Context<ApiEnv>): Required<AuthConfig> | null {
  const issuer = c.env.AUTH0_ISSUER;
  const audience = c.env.AUTH0_AUDIENCE;

  if (!issuer || !audience) {
    return null;
  }

  return { issuer, audience };
}

function getJwks(issuer: string) {
  const normalizedIssuer = issuer.endsWith('/') ? issuer : `${issuer}/`;
  const jwksUrl = new URL('.well-known/jwks.json', normalizedIssuer).toString();
  const cached = jwksByIssuer.get(jwksUrl);

  if (cached) {
    return cached;
  }

  const jwks = createRemoteJWKSet(new URL(jwksUrl));
  jwksByIssuer.set(jwksUrl, jwks);

  return jwks;
}

async function verifyAuth0Token(token: string, config: Required<AuthConfig>): Promise<JWTPayload> {
  const issuer = config.issuer.endsWith('/') ? config.issuer : `${config.issuer}/`;
  const result = await jwtVerify(token, getJwks(issuer), {
    issuer,
    audience: config.audience,
  });

  return result.payload;
}

export function authMiddleware(options: AuthMiddlewareOptions = {}): MiddlewareHandler<ApiEnv> {
  const publicPaths = new Set(options.publicPaths ?? ['/health']);
  const verifyToken = options.verifyToken ?? verifyAuth0Token;

  return async (c, next) => {
    if (publicPaths.has(new URL(c.req.url).pathname)) {
      await next();
      return;
    }

    const config = getAuthConfig(c);

    if (!config) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = getBearerToken(c.req.header('Authorization'));

    if (!token) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
      c.set('auth', await verifyToken(token, config));
    } catch {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    await next();
  };
}
