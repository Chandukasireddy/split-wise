"use server";

import { db } from "@/lib/db";
import { 
  hashPassword, 
  comparePassword, 
  createSession, 
  setSessionCookie, 
  deleteSessionCookie 
} from "@/lib/auth";

export interface AuthActionResult {
  success: boolean;
  error?: string;
}

export async function signUp(
  formData: FormData
): Promise<AuthActionResult> {
  const username = formData.get("username")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString();
  const name = formData.get("name")?.toString().trim();

  if (!username || !password || !name) {
    return { success: false, error: "All fields are required." };
  }

  if (username.length < 3) {
    return { success: false, error: "Username must be at least 3 characters." };
  }

  if (password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters." };
  }

  try {
    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return { success: false, error: "Username is already taken." };
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user in database
    const newUser = await db.user.create({
      data: {
        username,
        password: passwordHash,
        name,
      },
    });

    // Create session & set cookie
    const token = await createSession(newUser.id, newUser.username);
    await setSessionCookie(token);

    // Log activity
    await db.activityLog.create({
      data: {
        userId: newUser.id,
        description: `joined SplitEasy! Welcome!`,
      },
    });

    return { success: true };
  } catch (err) {
    console.error("Sign up error:", err);
    return { success: false, error: "An unexpected error occurred during signup." };
  }
}

export async function signIn(
  formData: FormData
): Promise<AuthActionResult> {
  const username = formData.get("username")?.toString().trim().toLowerCase();
  const password = formData.get("password")?.toString();

  if (!username || !password) {
    return { success: false, error: "Username and password are required." };
  }

  try {
    // Find user
    const user = await db.user.findUnique({
      where: { username },
    });

    if (!user) {
      return { success: false, error: "Invalid username or password." };
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return { success: false, error: "Invalid username or password." };
    }

    // Create session & set cookie
    const token = await createSession(user.id, user.username);
    await setSessionCookie(token);

    return { success: true };
  } catch (err) {
    console.error("Sign in error:", err);
    return { success: false, error: "An unexpected error occurred during signin." };
  }
}

export async function signOut(): Promise<AuthActionResult> {
  try {
    await deleteSessionCookie();
    return { success: true };
  } catch (err) {
    console.error("Sign out error:", err);
    return { success: false, error: "Failed to sign out." };
  }
}
