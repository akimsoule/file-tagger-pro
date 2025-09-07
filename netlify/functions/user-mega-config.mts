import { Context } from "@netlify/functions";
import { Storage } from "megajs";

import { encryptionService } from "../files.core/src/services/encryptionService";
import { userMegaConfigService } from "../files.core/src/services/userMegaConfigService";
import {
  createErrorResponse,
  createSuccessResponse,
  handleCorsOptions,
  verifyToken,
} from "./shared/middleware.mts";

// --- helpers decryption (XOR) ---
function fromBase64(b64: string): string {
  if (typeof atob !== "undefined") return atob(b64);
  return Buffer.from(b64, "base64").toString("binary");
}

function decrypt(encryptedText: string, key: string): string {
  let decrypted = "";
  for (let i = 0; i < encryptedText.length; i++) {
    decrypted += String.fromCharCode(encryptedText.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return decrypted;
}

function tryDecryptCredentials(body: any): {
  email?: string;
  password?: string;
  key?: string;
} {
  // Compat: acceptez email/password en clair ou emailEnc/passwordEnc avec key
  const email: string | undefined = body?.email;
  const password: string | undefined = body?.password;
  const emailEnc: string | undefined = body?.emailEnc;
  const passwordEnc: string | undefined = body?.passwordEnc;
  const key: string | undefined = body?.key;
  const enc: string | undefined = body?.enc;

  if (email && password) return { email, password };
  if (enc === "xor" && emailEnc && passwordEnc && key) {
    try {
      const emailPlain = decrypt(fromBase64(emailEnc), key);
      const passwordPlain = decrypt(fromBase64(passwordEnc), key);
      return { email: emailPlain, password: passwordPlain, key };
    } catch (e) {
      // fallback silencieux: retournera undefined et sera géré par validations
      console.warn("Decrypt XOR failed:", e);
    }
  }
  return {};
}

/**
 * Netlify Function pour gérer les configurations MEGA des utilisateurs
 */
export default async function handler(request: Request, context: Context): Promise<Response> {
  const { url, method } = request;
  const urlPath = new URL(url);
  const segments = urlPath.pathname.split("/").filter(Boolean);
  // Robust route detection (works under /.netlify/functions/* and /api/*)
  const last = segments[segments.length - 1];
  const prev = segments[segments.length - 2];
  const isTestRoute = prev === "user-mega-config" && last === "test";

  // CORS preflight
  if (method === "OPTIONS") {
    return handleCorsOptions();
  }
  // Authentification requise pour toutes les routes
  let userId: string;
  try {
    const user = verifyToken(request);
    if (!user) {
      throw new Error("Token invalide");
    }
    userId = user.userId;
  } catch (error) {
    return new Response(JSON.stringify({ error: "Token d'authentification invalide" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    switch (method) {
      case "GET":
        // GET /user-mega-config - Récupérer la configuration MEGA de l'utilisateur
        return await getUserMegaConfig(userId);

      case "POST":
        // POST /user-mega-config/test - Tester une connexion MEGA sans sauvegarder
        if (isTestRoute) {
          return await testUserMegaCredentials(request);
        }
        // POST /user-mega-config - Créer/mettre à jour la configuration MEGA
        return await upsertUserMegaConfig(request, userId);

      case "DELETE":
        // DELETE /user-mega-config - Supprimer la configuration MEGA
        return await deleteUserMegaConfig(userId);

      default:
        return createErrorResponse("Méthode non autorisée", 405);
    }
  } catch (error) {
    console.error("Erreur dans user-mega-config API:", error);
    return createErrorResponse(
      "Erreur interne du serveur",
      500,
      error instanceof Error ? error.message : "Erreur inconnue",
    );
  }
}

/**
 * Récupère la configuration MEGA de l'utilisateur
 */
async function getUserMegaConfig(userId: string): Promise<Response> {
  const config = await userMegaConfigService.getUserMegaConfig(userId);

  if (!config) {
    return createSuccessResponse({
      hasConfig: false,
      message: "Aucune configuration MEGA trouvée",
    });
  }

  return createSuccessResponse({
    hasConfig: true,
    config: {
      id: config.id,
      email: config.email,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    },
  });
}

/**
 * Crée ou met à jour la configuration MEGA de l'utilisateur
 */
async function upsertUserMegaConfig(request: Request, userId: string): Promise<Response> {
  const body = await request.json();
  const { emailEnc, passwordEnc, key } = body;

  if (!emailEnc || !passwordEnc || !key) {
    return createErrorResponse("Email, mot de passe ou clé MEGA requis", 400);
  }

  const config = await userMegaConfigService.upsertUserMegaConfig(userId, {
    emailEnc,
    passwordEnc,
    key,
  });

  return createSuccessResponse({
    message: "Configuration MEGA mise à jour avec succès",
    config: {
      id: config.id,
      email: config.email,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    },
  });
}

/**
 * Teste une connexion MEGA sans sauvegarder les identifiants
 * POST /user-mega-config/test { email, password }
 */
async function testUserMegaCredentials(request: Request): Promise<Response> {
  const body = await request.json();
  const { emailEnc, passwordEnc, key } = body;

  if (!emailEnc || !passwordEnc || !key) {
    return createErrorResponse("Email, mot de passe ou clé MEGA requis", 400);
  }

  const { email: decryptedEmail, password: decryptedPassword } = encryptionService.decryptWithKey(
    emailEnc,
    passwordEnc,
    key,
  );

  try {
    // Essayer de se connecter à MEGA
    await new Storage({ email: decryptedEmail, password: decryptedPassword }).ready;
    return createSuccessResponse({
      ok: true,
      message: "Connexion MEGA réussie",
    });
  } catch (e) {
    return createErrorResponse(
      "Échec de connexion à MEGA. Vérifiez votre email et votre mot de passe, puis réessayez.",
      400,
    );
  }
}

/**
 * Supprime la configuration MEGA de l'utilisateur
 */
async function deleteUserMegaConfig(userId: string): Promise<Response> {
  await userMegaConfigService.deleteUserMegaConfig(userId);

  return createSuccessResponse({
    message: "Configuration MEGA supprimée avec succès",
  });
}
