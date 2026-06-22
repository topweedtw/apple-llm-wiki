export type ApiBindings = {
  AUTH0_ISSUER?: string;
  AUTH0_AUDIENCE?: string;
};

export type AuthClaims = {
  sub?: string;
  [claim: string]: unknown;
};

export type ApiVariables = {
  auth: AuthClaims;
};

export type ApiEnv = {
  Bindings: ApiBindings;
  Variables: ApiVariables;
};
