import { SignJWT, jwtVerify } from "jose";

export type SessionPayload = {
  adminId: number;
};

export function secretKey() {
  const secret = process.env.SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "Defina SESSION_SECRET no .env.local com pelo menos 32 caracteres.",
    );
  }

  return new TextEncoder().encode(secret);
}

export async function encrypt(payload: SessionPayload) {
  return new SignJWT({ adminId: payload.adminId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());
}

export async function decrypt(
  session: string | undefined,
): Promise<SessionPayload | null> {
  if (!session) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(session, secretKey(), {
      algorithms: ["HS256"],
    });
    const adminId = payload.adminId;

    if (typeof adminId !== "number") {
      return null;
    }

    return { adminId };
  } catch {
    return null;
  }
}
