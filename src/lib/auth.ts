const TOKEN_KEY = 'audicon_token';

export type JwtClaims = {
  sub: number;
  email: string;
  isMaster: boolean;
  companyId: number | null;
  iat?: number;
  exp?: number;
};

function decodeJwt(token: string): JwtClaims | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as JwtClaims;
  } catch {
    return null;
  }
}

export const authStorage = {
  get(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },
  set(token: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, token);
  },
  clear() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
  },
  getClaims(): JwtClaims | null {
    const token = this.get();
    if (!token) return null;
    return decodeJwt(token);
  },
};
