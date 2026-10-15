import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(scryptCallback);
const password = process.argv[2];
if (!password || password.length < 12) {
  console.error("Usage: node scripts/hash-password.mjs '<password of at least 12 characters>'");
  process.exit(1);
}
const salt = randomBytes(16).toString("hex");
const derived = await scrypt(password, salt, 64);
console.log(`scrypt:${salt}:${Buffer.from(derived).toString("hex")}`);
