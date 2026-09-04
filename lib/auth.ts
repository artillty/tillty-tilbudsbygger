const enc = new TextEncoder();

export const COOKIE = "tilbud_auth";

/** Kortlivet token afledt af kodeordet. Ingen hemmelighed ligger i cookien. */
export async function tokenFor(password: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode("tilbudsbygger:v1"));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function isValidToken(token: string | undefined): Promise<boolean> {
  const pw = process.env.APP_PASSWORD;
  if (!pw || !token) return false;
  const expected = await tokenFor(pw);
  if (token.length !== expected.length) return false;
  // konstant-tid sammenligning
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
