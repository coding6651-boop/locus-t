/* eslint-disable */
import type { FunctionReference } from "convex/server";

export declare const activateToken: FunctionReference<"mutation", "internal", { token: string; deviceId: string; now: number }, { ok: boolean; code: string; message: string; token?: string; user_id?: string; device_id?: string; expires_at?: number }>;
export declare const createToken: FunctionReference<"mutation", "internal", { fullName: string; userId: string; expiresAt: number; maxUses: number; now: number }, { token: string }>;
export declare const upsertLicense: FunctionReference<"mutation", "internal", { token: string; fullName: string; userId: string; status: string; deviceId: string | null; maxUses: number; usedCount: number; expiresAt: number; now: number }, any>;
export declare const getAllLicenses: FunctionReference<"query", "internal", {}, any>;
export declare const createLicenseToken: FunctionReference<"mutation", "public", { fullName: string; userId: string; expiresAt?: number; maxUses?: number }, { token: string; fullName: string; userId: string; expiresAt: number; signature: string }>;
