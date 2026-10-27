import "server-only";
import type { Pool, RowDataPacket } from "mysql2/promise";
import { ensureDatabase as ensure, getPool as createPool } from "./setup.mjs";

export function getPool(): Pool {
  return createPool();
}

export function ensureDatabase(): Promise<void> {
  return ensure();
}

export function databaseError(error: unknown): Error {
  const code =
    error && typeof error === "object" && "code" in error
      ? String(error.code)
      : "";

  if (code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "ETIMEDOUT") {
    return new Error(
      "Não foi possível conectar ao MySQL em localhost. Inicie o MariaDB do XAMPP.",
    );
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error("Erro ao acessar o banco de dados.");
}

export type AdminRecord = RowDataPacket & {
  id: number;
  name: string;
  email: string;
  password_hash: string;
};
