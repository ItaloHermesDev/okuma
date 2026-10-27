"use server";

import { redirect } from "next/navigation";
import { authenticateAdmin } from "@/lib/auth";
import { createSession, deleteSession } from "@/lib/session";

export type LoginState = {
  message?: string;
};

export async function login(
  _state: LoginState | undefined,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { message: "Informe e-mail e senha." };
  }

  try {
    const admin = await authenticateAdmin(email, password);

    if (!admin) {
      return { message: "E-mail ou senha inválidos." };
    }

    await createSession(admin.id);
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "Não foi possível entrar. Tente de novo.",
    };
  }

  redirect("/admin");
}

export async function logout() {
  await deleteSession();
  redirect("/admin/login");
}
