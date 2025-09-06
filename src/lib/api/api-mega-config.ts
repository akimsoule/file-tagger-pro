import { api } from "./api";

export interface UserMegaConfigInfo {
  id: string;
  email: string;
  isActive: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface GetUserMegaConfigResponse {
  hasConfig: boolean;
  message?: string;
  config?: UserMegaConfigInfo;
}

export async function getUserMegaConfig() {
  return api<GetUserMegaConfigResponse>(`/user-mega-config`, {
    method: "GET",
    auth: true,
  });
}

export async function saveUserMegaConfig(email: string, password: string) {
  return api<{ message: string; config: UserMegaConfigInfo }>(
    `/user-mega-config`,
    {
      method: "POST",
      auth: true,
      body: JSON.stringify({ email, password }),
    }
  );
}

export async function toggleUserMegaConfig(isActive: boolean) {
  return api<{ message: string; config: UserMegaConfigInfo }>(
    `/user-mega-config`,
    {
      method: "PUT",
      auth: true,
      body: JSON.stringify({ isActive }),
    }
  );
}

export async function deleteUserMegaConfig() {
  return api<{ message: string }>(`/user-mega-config`, {
    method: "DELETE",
    auth: true,
  });
}
