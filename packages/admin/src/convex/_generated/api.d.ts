/* eslint-disable */
import type { FunctionReference } from "convex/server";

declare const api: {
  admins: {
    login: FunctionReference<"mutation", "public", { email: string; password: string }, { success: boolean; error?: string; token?: string; name?: string; email?: string }>;
  };
  licenses: {
    createLicenseToken: FunctionReference<"mutation", "public", { fullName?: string; expiresAt: number; maxUses?: number }, { success: boolean; token?: string; error?: string }>;
    getAllLicenses: FunctionReference<"query", "public", {}, any>;
  };
};
export { api };

export declare const internal: {};
export declare const components: {};
