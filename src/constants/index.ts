/**
 * Constantes de l'application
 */

// Limites générales
export const LIMITS = {
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_FILES_PER_UPLOAD: 10,
  MAX_SEARCH_RESULTS: 100,
  DEFAULT_SEARCH_RESULTS: 20,
  MAX_TAG_LENGTH: 50,
  MAX_TAGS_PER_ITEM: 50,
  MAX_STRING_LENGTH: 1000,
  MAX_DESCRIPTION_LENGTH: 2000,
  MAX_FILENAME_LENGTH: 255,
} as const;

// Configuration de l'API
export const API_CONFIG = {
  TIMEOUT: 30000, // 30 secondes
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 seconde
  BATCH_SIZE: 50,
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 100,
} as const;

// Types de fichiers supportés
export const SUPPORTED_FILE_TYPES = {
  IMAGES: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
  DOCUMENTS: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
    "application/rtf",
  ],
  ARCHIVES: [
    "application/zip",
    "application/x-tar",
    "application/gzip",
    "application/x-7z-compressed",
    "application/x-rar-compressed",
  ],
  VIDEOS: ["video/mp4", "video/mpeg", "video/quicktime", "video/x-msvideo", "video/webm"],
  AUDIO: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/webm"],
} as const;

// Messages d'erreur standardisés
export const ERROR_MESSAGES = {
  // Authentification
  UNAUTHORIZED: "Accès non autorisé",
  SESSION_EXPIRED: "Session expirée",
  INVALID_CREDENTIALS: "Identifiants invalides",

  // Validation
  REQUIRED_FIELD: (field: string) => `Le champ '${field}' est requis`,
  INVALID_FORMAT: (field: string) => `Format invalide pour le champ '${field}'`,
  STRING_TOO_LONG: (field: string, max: number) =>
    `Le champ '${field}' ne peut pas dépasser ${max} caractères`,
  INVALID_EMAIL: "Adresse email invalide",
  INVALID_FILE_TYPE: "Type de fichier non supporté",
  FILE_TOO_LARGE: (maxSize: string) => `Fichier trop volumineux (maximum ${maxSize})`,

  // Ressources
  NOT_FOUND: (resource: string) => `${resource} introuvable`,
  ALREADY_EXISTS: (resource: string) => `${resource} existe déjà`,
  CANNOT_DELETE: (resource: string) => `Impossible de supprimer ${resource}`,

  // Opérations
  OPERATION_FAILED: "Opération échouée",
  NETWORK_ERROR: "Erreur de réseau",
  SERVER_ERROR: "Erreur serveur",
  RATE_LIMIT_EXCEEDED: "Trop de requêtes",

  // Spécifiques
  CYCLE_DETECTED: "Opération créerait un cycle",
  DUPLICATE_ITEM: "Élément déjà présent",
  INVALID_PARENT: "Parent invalide",
} as const;

// Messages de succès standardisés
export const SUCCESS_MESSAGES = {
  CREATED: (resource: string) => `${resource} créé avec succès`,
  UPDATED: (resource: string) => `${resource} mis à jour avec succès`,
  DELETED: (resource: string) => `${resource} supprimé avec succès`,
  UPLOADED: (count: number) => `${count} fichier(s) téléchargé(s) avec succès`,
  SAVED: "Sauvegarde réussie",
  SYNCHRONIZED: "Synchronisation terminée",
  CONNECTION_ESTABLISHED: "Connexion établie",
} as const;

// Configuration des couleurs/thème
export const THEME_CONFIG = {
  DEFAULT_FOLDER_COLOR: "#3b82f6",
  DEFAULT_TAG_COLORS: [
    "#ef4444",
    "#f97316",
    "#f59e0b",
    "#eab308",
    "#84cc16",
    "#22c55e",
    "#10b981",
    "#14b8a6",
    "#06b6d4",
    "#3b82f6",
    "#6366f1",
    "#8b5cf6",
    "#a855f7",
    "#d946ef",
    "#ec4899",
    "#f43f5e",
  ],
  GRADIENT_CLASSES: {
    PRIMARY: "bg-gradient-to-r from-blue-500 to-purple-600",
    SUCCESS: "bg-gradient-to-r from-green-500 to-emerald-600",
    WARNING: "bg-gradient-to-r from-yellow-500 to-orange-600",
    ERROR: "bg-gradient-to-r from-red-500 to-pink-600",
  },
} as const;

// Configuration des animations
export const ANIMATION_CONFIG = {
  DURATION: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
  },
  EASING: {
    EASE_IN: "ease-in",
    EASE_OUT: "ease-out",
    EASE_IN_OUT: "ease-in-out",
  },
} as const;

// Configuration des breakpoints
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  "2XL": 1536,
} as const;

// Configuration du localStorage
export const STORAGE_KEYS = {
  USER_SETTINGS: "file-tagger-settings",
  AUTH_TOKEN: "file-tagger-token",
  THEME: "file-tagger-theme",
  LAST_FOLDER: "file-tagger-last-folder",
  UPLOAD_QUEUE: "file-tagger-upload-queue",
} as const;

// Configuration des formats de date
export const DATE_FORMATS = {
  SHORT: "dd/MM/yyyy",
  LONG: "dd MMMM yyyy",
  WITH_TIME: "dd/MM/yyyy HH:mm",
  ISO: "yyyy-MM-dd",
  TIME_ONLY: "HH:mm",
} as const;

// Configuration des unités de taille
export const SIZE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

// Expressions régulières utiles
export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  FILENAME_SAFE: /^[a-zA-Z0-9._-]+$/,
  TAG_VALID: /^[a-zA-Z0-9\-_\s]+$/,
  URL_SAFE: /^[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;%=]+$/,
} as const;

// Configuration des notifications
export const NOTIFICATION_CONFIG = {
  DEFAULT_DURATION: 5000, // 5 secondes
  SUCCESS_DURATION: 3000,
  ERROR_DURATION: 7000,
  WARNING_DURATION: 5000,
  MAX_NOTIFICATIONS: 5,
} as const;

// Types d'export des constantes pour une utilisation type-safe
export type SupportedFileType =
  (typeof SUPPORTED_FILE_TYPES)[keyof typeof SUPPORTED_FILE_TYPES][number];
export type ThemeGradient = keyof typeof THEME_CONFIG.GRADIENT_CLASSES;
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];
export type DateFormat = (typeof DATE_FORMATS)[keyof typeof DATE_FORMATS];
export type SizeUnit = (typeof SIZE_UNITS)[number];
