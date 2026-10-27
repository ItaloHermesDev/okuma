import "server-only";
import { redirect } from "next/navigation";
import type { RowDataPacket } from "mysql2/promise";
import {
  databaseError,
  ensureDatabase,
  getPool,
  type AdminRecord,
} from "./database";
import { verifyPassword } from "./password.mjs";
import { deleteSession, getSession } from "./session";

export type Admin = {
  id: number;
  name: string;
  email: string;
};

async function findAdminById(id: number) {
  await ensureDatabase();
  const [rows] = await getPool().query<AdminRecord[]>(
    "SELECT id, name, email, password_hash FROM admins WHERE id = ? LIMIT 1",
    [id],
  );
  const admin = rows[0];

  if (!admin) {
    return null;
  }

  return { id: admin.id, name: admin.name, email: admin.email };
}

export async function getOptionalAdmin(): Promise<Admin | null> {
  const session = await getSession();

  if (!session?.adminId) {
    return null;
  }

  try {
    const admin = await findAdminById(session.adminId);

    if (!admin) {
      await deleteSession();
    }

    return admin;
  } catch (error) {
    throw databaseError(error);
  }
}

export async function getCurrentAdmin(): Promise<Admin> {
  const admin = await getOptionalAdmin();

  if (!admin) {
    redirect("/admin/login");
  }

  return admin;
}

export async function authenticateAdmin(email: string, password: string) {
  try {
    await ensureDatabase();
    const [rows] = await getPool().query<AdminRecord[]>(
      "SELECT id, name, email, password_hash FROM admins WHERE email = ? LIMIT 1",
      [email],
    );
    const admin = rows[0];

    if (!admin || !(await verifyPassword(password, admin.password_hash))) {
      return null;
    }

    return { id: admin.id, name: admin.name, email: admin.email };
  } catch (error) {
    throw databaseError(error);
  }
}

export async function getDatabaseStatus() {
  await getCurrentAdmin();

  try {
    await ensureDatabase();
    const [rows] = await getPool().query<RowDataPacket[]>(
      "SELECT DATABASE() AS name, VERSION() AS version",
    );
    const row = rows[0];

    return {
      name: String(row?.name ?? ""),
      version: String(row?.version ?? ""),
    };
  } catch (error) {
    throw databaseError(error);
  }
}
