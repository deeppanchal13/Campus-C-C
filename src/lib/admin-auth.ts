import "server-only";
import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";

const scrypt = promisify(scryptCallback);
const COOKIE = "campusvault_admin";
const SESSION_SECONDS = 60 * 60 * 8;

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("ADMIN_SESSION_SECRET must contain at least 32 characters.");
  return value;
}

export async function createPasswordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function verifyAdminCredentials(username: string, password: string) {
  const expectedUser = process.env.ADMIN_USERNAME;
  const encoded = process.env.ADMIN_PASSWORD_HASH;
  if (!expectedUser || !encoded || username.length > 128 || password.length > 256) return false;
  const [algorithm, salt, expectedHex] = encoded.split(":");
  if (algorithm !== "scrypt" || !salt || !expectedHex || !/^[a-f0-9]{128}$/i.test(expectedHex)) return false;
  const actualUser = Buffer.from(username);
  const wantedUser = Buffer.from(expectedUser);
  const userMatches = actualUser.length === wantedUser.length && timingSafeEqual(actualUser, wantedUser);
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(expectedHex, "hex");
  return userMatches && timingSafeEqual(actual, expected);
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export async function startAdminSession() {
  const expiry = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = Buffer.from(JSON.stringify({ sub: process.env.ADMIN_USERNAME, exp: expiry })).toString("base64url");
  const jar = await cookies();
  jar.set(COOKIE, `${payload}.${signature(payload)}`, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_SECONDS,
  });
}

export async function isAdmin() {
  try {
    const value = (await cookies()).get(COOKIE)?.value;
    if (!value) return false;
    const [payload, supplied] = value.split(".");
    if (!payload || !supplied) return false;
    const expected = Buffer.from(signature(payload));
    const actual = Buffer.from(supplied);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return false;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { sub?: string; exp?: number };
    return data.sub === process.env.ADMIN_USERNAME && !!data.exp && data.exp > Math.floor(Date.now() / 1000);
  } catch { return false; }
}

export async function endAdminSession() {
  (await cookies()).delete(COOKIE);
}
