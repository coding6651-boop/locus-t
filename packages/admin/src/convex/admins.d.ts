/* eslint-disable */
import type { FunctionReference } from "convex/server";

export declare const login: FunctionReference<"mutation", "public", { email: string; password: string }, { token: string; name: string }>;
export declare const createAdmin: FunctionReference<"mutation", "internal", { email: string; password: string; name: string; now: number }, string>;
export declare const getAdminByEmail: FunctionReference<"query", "public", { email: string }, any>;
export declare const initDefaultAdmin: FunctionReference<"mutation", "public", {}, any>;
