const JWT_SECRET = process.env.JWT_SECRET || "split-easy-default-secret-change-it";
export const SESSION_COOKIE_NAME = "spliteasy_session";
const encoder = new TextEncoder();

// Helper to generate HMAC SHA-256 signature using native WebCrypto
async function generateSignature(data: string, secret: string): Promise<string> {
  const keyBuf = encoder.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBuf,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
  return Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface UserSession {
  userId: string;
  username: string;
}

export async function createSession(userId: string, username: string): Promise<string> {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const dataPayload = `${userId}:${username}:${expiresAt}`;
  const signature = await generateSignature(dataPayload, JWT_SECRET);
  return `${dataPayload}:${signature}`;
}

export async function verifySession(token: string | undefined): Promise<UserSession | null> {
  if (!token) return null;
  
  try {
    const parts = token.split(":");
    if (parts.length !== 4) return null;
    
    const [userId, username, expiresAtStr, signature] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);
    
    if (isNaN(expiresAt) || expiresAt < Date.now()) {
      return null; // Expired or invalid time
    }
    
    const dataPayload = `${userId}:${username}:${expiresAt}`;
    const expectedSignature = await generateSignature(dataPayload, JWT_SECRET);
    
    if (signature !== expectedSignature) {
      return null; // Invalid signature
    }
    
    return { userId, username };
  } catch (err) {
    console.error("Session verification error:", err);
    return null;
  }
}
