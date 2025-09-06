// Client API minimal pour communiquer avec les fonctions Netlify
// BASE_URL s'adapte: en dev via netlify dev -> /.netlify/functions, sinon /api (redirect)

const BASE_INTERNAL = "/.netlify/functions";
const BASE_REDIRECT = "/api";

let chosenBase: string | null = null;
function resolveBase(): string {
  if (chosenBase) return chosenBase;
  if (typeof window === "undefined") return BASE_REDIRECT;
  const isDev =
    typeof import.meta !== "undefined" && (import.meta as any).env?.DEV; // eslint-disable-line @typescript-eslint/no-explicit-any
  // Heuristique: quand on lance seulement `vite` (npm run dev) il n'y a pas de proxy /api => on utilise /.netlify/functions
  if (isDev && !window.location.pathname.startsWith("/.netlify/functions")) {
    chosenBase = BASE_INTERNAL;
  } else {
    chosenBase = BASE_REDIRECT;
  }
  return chosenBase;
}

let authToken: string | null = null;
let authErrorHandler: (() => void) | null = null;
let isRefreshing = false;
let pendingQueue: Array<() => void> = [];

export function setAuthToken(token: string | null) {
  authToken = token;
  if (typeof window !== "undefined") {
    if (token) localStorage.setItem("auth_token", token);
    else localStorage.removeItem("auth_token");
  }
}

export function loadStoredToken() {
  if (typeof window !== "undefined") {
    authToken = localStorage.getItem("auth_token");
  }
  return authToken;
}

export function onAuthError(handler: () => void) {
  authErrorHandler = handler;
}

interface ApiOptions extends RequestInit {
  auth?: boolean;
  query?: Record<string, string | number | undefined | null>;
}

interface InternalApiOptions extends ApiOptions {
  _retried?: boolean;
}

export async function api<T = unknown>(
  path: string,
  options: InternalApiOptions = {}
): Promise<T> {
  const base = resolveBase();
  const url = new URL(base + path, window.location.origin);
  if (options.query) {
    Object.entries(options.query).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    });
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.auth) {
    if (!authToken) loadStoredToken();
    if (authToken) headers["Authorization"] = "Bearer " + authToken;
  }
  const res = await fetch(url.toString(), {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* ignore */
  }
  if (res.status === 401 && options.auth) {
    // Tentative de refresh unique
    if (!options._retried) {
      try {
        // Mutualiser les refresh concurrents
  const refreshPromise = new Promise<void>((resolve) => {
          pendingQueue.push(resolve);
        });
        if (!isRefreshing) {
          isRefreshing = true;
          // Appel direct, évite l'import dynamique du même module
          authRefresh()
            .then(() => {
              isRefreshing = false;
              pendingQueue.forEach((fn) => fn());
              pendingQueue = [];
            })
            .catch(() => {
              isRefreshing = false;
              pendingQueue = [];
              setAuthToken(null);
              authErrorHandler?.();
            });
        }
        await refreshPromise; // attend le refresh
        if (!loadStoredToken()) throw new Error("Refresh échoué");
        return api<T>(path, { ...options, _retried: true });
      } catch {
        setAuthToken(null);
        authErrorHandler?.();
      }
    } else {
      setAuthToken(null);
      authErrorHandler?.();
    }
  }
  if (!res.ok) {
    // Si 404 sur /api en dev, retenter automatiquement avec /.netlify/functions une seule fois
    if (res.status === 404 && !options._retried) {
      const previousBase = chosenBase;
      if (previousBase === BASE_REDIRECT) {
        chosenBase = BASE_INTERNAL;
        try {
          return api<T>(path, { ...options, _retried: true });
        } catch {
          chosenBase = previousBase; // rollback si échec
        }
      }
    }
    const obj =
      json && typeof json === "object" ? (json as Record<string, unknown>) : {};
    const errMsg =
      (obj["error"] as string) ||
      (obj["message"] as string) ||
      `HTTP ${res.status}`;
    throw new Error(errMsg);
  }
  return json as T;
}

// Auth endpoints wrappers
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface AuthResponse {
  token: string;
  user: AuthUser;
  message: string;
}

export async function authLogin(email: string, password: string) {
  const data = await api<AuthResponse>(`/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setAuthToken(data.token);
  return data;
}

export async function authRegister(
  email: string,
  password: string,
  name: string
) {
  const data = await api<AuthResponse>(`/auth/register`, {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
  setAuthToken(data.token);
  return data;
}

export async function authRefresh() {
  const data = await api<AuthResponse>(`/auth/refresh`, {
    method: "POST",
    auth: true,
  });
  setAuthToken(data.token);
  return data;
}

export async function authVerify() {
  // L'endpoint auth exige POST pour toutes actions
  return api<{ valid: boolean; user: AuthUser }>(`/auth/verify`, {
    method: "POST",
    auth: true,
  });
}

export async function apiHealth() {
  return api(`/health`);
}
