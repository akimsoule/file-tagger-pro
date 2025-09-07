/**
 * Utilitaires communs pour l'application frontend
 */

import type { SizeUnit } from "@/constants";
import { LIMITS, REGEX_PATTERNS, SIZE_UNITS } from "@/constants";

// === VALIDATION ===

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateEmail(email: string): ValidationResult {
  if (!email?.trim()) {
    return { isValid: false, error: "Email requis" };
  }

  if (!REGEX_PATTERNS.EMAIL.test(email)) {
    return { isValid: false, error: "Format email invalide" };
  }

  return { isValid: true };
}

export function validateString(
  value: string,
  fieldName: string,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
  } = {},
): ValidationResult {
  const { required = true, minLength = 1, maxLength = LIMITS.MAX_STRING_LENGTH, pattern } = options;

  if (!value?.trim()) {
    return {
      isValid: !required,
      error: required ? `${fieldName} est requis` : undefined,
    };
  }

  const trimmed = value.trim();

  if (trimmed.length < minLength) {
    return {
      isValid: false,
      error: `${fieldName} doit contenir au moins ${minLength} caractères`,
    };
  }

  if (trimmed.length > maxLength) {
    return {
      isValid: false,
      error: `${fieldName} ne peut pas dépasser ${maxLength} caractères`,
    };
  }

  if (pattern && !pattern.test(trimmed)) {
    return {
      isValid: false,
      error: `${fieldName} contient des caractères non autorisés`,
    };
  }

  return { isValid: true };
}

export function validateTags(tags: string[]): ValidationResult {
  if (tags.length > LIMITS.MAX_TAGS_PER_ITEM) {
    return {
      isValid: false,
      error: `Maximum ${LIMITS.MAX_TAGS_PER_ITEM} tags autorisés`,
    };
  }

  for (const tag of tags) {
    const tagValidation = validateString(tag, "Tag", {
      maxLength: LIMITS.MAX_TAG_LENGTH,
      pattern: REGEX_PATTERNS.TAG_VALID,
    });

    if (!tagValidation.isValid) {
      return tagValidation;
    }
  }

  return { isValid: true };
}

// === FORMATAGE ===

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  const unit = SIZE_UNITS[i] as SizeUnit;

  return `${size.toFixed(i === 0 ? 0 : 1)} ${unit}`;
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("fr-FR").format(num);
}

export function formatDate(
  date: Date | string,
  format: "short" | "long" | "relative" = "short",
): string {
  const d = typeof date === "string" ? new Date(date) : date;

  if (format === "relative") {
    return formatRelativeTime(d);
  }

  const options: Intl.DateTimeFormatOptions =
    format === "long"
      ? { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }
      : { year: "numeric", month: "2-digit", day: "2-digit" };

  return new Intl.DateTimeFormat("fr-FR", options).format(d);
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Il y a quelques secondes";
  if (diffInSeconds < 3600) return `Il y a ${Math.floor(diffInSeconds / 60)} minutes`;
  if (diffInSeconds < 86400) return `Il y a ${Math.floor(diffInSeconds / 3600)} heures`;
  if (diffInSeconds < 2592000) return `Il y a ${Math.floor(diffInSeconds / 86400)} jours`;
  if (diffInSeconds < 31536000) return `Il y a ${Math.floor(diffInSeconds / 2592000)} mois`;

  return `Il y a ${Math.floor(diffInSeconds / 31536000)} ans`;
}

export function truncateText(text: string, maxLength: number, suffix = "..."): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - suffix.length) + suffix;
}

// === UTILITAIRES DE COLLECTION ===

export function groupBy<T, K extends string | number>(
  array: T[],
  keyFn: (item: T) => K,
): Record<K, T[]> {
  return array.reduce(
    (groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    },
    {} as Record<K, T[]>,
  );
}

export function sortBy<T>(
  array: T[],
  keyFn: (item: T) => string | number | Date,
  direction: "asc" | "desc" = "asc",
): T[] {
  return [...array].sort((a, b) => {
    const aVal = keyFn(a);
    const bVal = keyFn(b);

    if (aVal < bVal) return direction === "asc" ? -1 : 1;
    if (aVal > bVal) return direction === "asc" ? 1 : -1;
    return 0;
  });
}

export function unique<T>(array: T[], keyFn?: (item: T) => string | number): T[] {
  if (!keyFn) {
    return Array.from(new Set(array));
  }

  const seen = new Set();
  return array.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function partition<T>(array: T[], predicate: (item: T) => boolean): [T[], T[]] {
  const truthy: T[] = [];
  const falsy: T[] = [];

  for (const item of array) {
    if (predicate(item)) {
      truthy.push(item);
    } else {
      falsy.push(item);
    }
  }

  return [truthy, falsy];
}

// === UTILITAIRES DOM ET ÉVÉNEMENTS ===

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  }

  // Fallback pour les navigateurs plus anciens
  return new Promise((resolve, reject) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand("copy");
      resolve();
    } catch (err) {
      reject(err);
    } finally {
      document.body.removeChild(textArea);
    }
  });
}

// === UTILITAIRES ASYNC ===

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function retry<T>(
  fn: () => Promise<T>,
  attempts: number = 3,
  delay: number = 1000,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (attempts > 1) {
      await sleep(delay);
      return retry(fn, attempts - 1, delay * 2);
    }
    throw error;
  }
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), timeoutMs)),
  ]);
}

// === UTILITAIRES DE COULEUR ===

export function generateColorFromString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function getContrastColor(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#000000";

  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 128 ? "#000000" : "#ffffff";
}

// === UTILITAIRES URL ET PARAMÈTRES ===

export function buildUrl(
  base: string,
  params: Record<string, string | number | boolean | undefined>,
): string {
  const url = new URL(base, window.location.origin);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

export function parseUrlParams(search: string): Record<string, string> {
  const params = new URLSearchParams(search);
  const result: Record<string, string> = {};

  for (const [key, value] of params) {
    result[key] = value;
  }

  return result;
}

// === UTILITAIRES DE DÉVELOPPEMENT ===

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}

export function createLogger(context: string) {
  return {
    debug: (...args: unknown[]) => {
      if (isDevelopment()) {
        console.debug(`[${context}]`, ...args);
      }
    },
    info: (...args: unknown[]) => {
      console.info(`[${context}]`, ...args);
    },
    warn: (...args: unknown[]) => {
      console.warn(`[${context}]`, ...args);
    },
    error: (...args: unknown[]) => {
      console.error(`[${context}]`, ...args);
    },
  };
}
