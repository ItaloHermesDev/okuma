import "server-only";
import { cookies } from "next/headers";
import { decrypt, encrypt } from "./session-crypto";

const COOKIE_NAME = "session";

export async function createSession(adminId: number) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const session = await encrypt({ adminId });
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession() {
  const cookie = (await cookies()).get(COOKIE_NAME)?.value;
  return decrypt(cookie);
}
