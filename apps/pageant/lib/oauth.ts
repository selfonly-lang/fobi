import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
export const random = () => randomBytes(32).toString("base64url");
export const challenge = (v: string) =>
  createHash("sha256").update(v).digest("base64url");
export const equal = (a: string, b: string) =>
  typeof a === "string" &&
  typeof b === "string" &&
  Buffer.byteLength(a) === Buffer.byteLength(b) &&
  timingSafeEqual(Buffer.from(a), Buffer.from(b));
export function seal(data: unknown, secret: string) {
  const iv = randomBytes(12),
    key = createHash("sha256")
      .update("pageant-self-bridge:" + secret)
      .digest(),
    cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data)),
    cipher.final(),
  ]);
  return [iv, encrypted, cipher.getAuthTag()]
    .map((x) => x.toString("base64url"))
    .join(".");
}
export function unseal(value: string, secret: string) {
  const [iv, encrypted, tag] = value.split(".");
  const d = createDecipheriv(
    "aes-256-gcm",
    createHash("sha256")
      .update("pageant-self-bridge:" + secret)
      .digest(),
    Buffer.from(iv, "base64url"),
  );
  d.setAuthTag(Buffer.from(tag, "base64url"));
  const data = JSON.parse(
    Buffer.concat([
      d.update(Buffer.from(encrypted, "base64url")),
      d.final(),
    ]).toString(),
  );
  if (data.expires < Date.now()) throw Error("expired");
  return data;
}
