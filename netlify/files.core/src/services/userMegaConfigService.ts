import prisma from "./database";
import { encryptionService } from "./encryptionService";

export interface UserMegaConfigData {
  emailEnc: string;
  passwordEnc: string;
  key?: string; // clé XOR à persister si fournie par le frontend
}

export interface UserMegaConfigResponse {
  id: string;
  userId: string;
  email: string; // Email en clair pour affichage
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Service de gestion des configurations MEGA par utilisateur
 */
export class UserMegaConfigService {
  /**
   * Crée ou met à jour la configuration MEGA d'un utilisateur
   */
  async upsertUserMegaConfig(
    userId: string,
    configData: UserMegaConfigData
  ): Promise<UserMegaConfigResponse> {
    // Stockage direct sans chiffrement
    const encEmail = configData.emailEnc;
    const encPassword = configData.passwordEnc;
    const key = configData.key;

    if (!key) {
      throw new Error("Clé de chiffrement manquante");
    }

    const config = await prisma.userMegaConfig.upsert({
      where: { userId },
      update: {
        email: encEmail,
        password: encPassword,
        encKey: key,
        updatedAt: new Date(),
      },
      create: {
        userId,
        email: encEmail,
        password: encPassword,
        encKey: key,
      },
    });

    // decrypt email and password if encKey is provided

    const { email: decryptedEmail } = encryptionService.decryptWithKey(
      encEmail,
      encPassword,
      key
    );
    return {
      id: config.id,
      userId: config.userId,
      email: decryptedEmail,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  /**
   * Récupère la configuration MEGA d'un utilisateur
   */
  async getUserMegaConfig(
    userId: string
  ): Promise<UserMegaConfigResponse | null> {
    const config = await prisma.userMegaConfig.findUnique({
      where: { userId },
    });

    if (!config) {
      return null;
    }

    // Retourner l'email tel quel; fallback déchiffré si une ancienne clé est présente
    let emailOut = config.email;
    if (config.encKey) {
      try {
        emailOut = encryptionService.decryptWithKey(
          config.email,
          config.password,
          config.encKey
        ).email;
      } catch {
        // ignore
      }
    }
    return {
      id: config.id,
      userId: config.userId,
      email: emailOut,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  /**
   * Récupère les credentials MEGA déchiffrés d'un utilisateur pour utilisation interne
   */
  async getUserMegaCredentials(
    userId: string
  ): Promise<{ email: string; password: string } | null> {
    const config = await prisma.userMegaConfig.findFirst({
      where: {
        userId,
      },
    });

    if (!config) {
      return null;
    }

    if (config.encKey) {
      try {
        return encryptionService.decryptWithKey(
          config.email,
          config.password,
          config.encKey
        );
      } catch {
        // ignore and return plain
      }
    }
    return { email: config.email, password: config.password };
  }

  /**
   * Supprime la configuration MEGA d'un utilisateur
   */
  async deleteUserMegaConfig(userId: string): Promise<void> {
    await prisma.userMegaConfig.delete({
      where: { userId },
    });
  }
}

export const userMegaConfigService = new UserMegaConfigService();
