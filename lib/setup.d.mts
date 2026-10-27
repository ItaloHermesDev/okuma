import type { Pool } from "mysql2/promise";

export function getPool(): Pool;
export function ensureDatabase(): Promise<void>;
export function closePool(): Promise<void>;
