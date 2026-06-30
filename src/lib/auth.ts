import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "./db";
import { 
  SESSION_COOKIE_NAME, 
  verifySession, 
  UserSession,
  createSession
} from "./session";

// Re-export type and session functions
export type { UserSession };
export { verifySession, createSession };

// Password hashing and comparison
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Session Cookie helpers
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

export async function deleteSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

// Session checking helpers for Server Actions/Components
export async function getCurrentUser(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  return verifySession(sessionCookie?.value);
}

export async function getAuthenticatedUser() {
  const session = await getCurrentUser();
  if (!session) return null;
  
  return db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, username: true, name: true },
  });
}
