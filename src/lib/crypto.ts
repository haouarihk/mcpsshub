import { randomBytes } from "crypto";
import { nanoid } from "nanoid";

export function generateToken(length = 48): string {
  return randomBytes(length).toString("base64url");
}

export function generateId(): string {
  return nanoid(16);
}
