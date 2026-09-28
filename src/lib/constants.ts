export const INTERNAL_EMAIL_DOMAIN =
  process.env.NEXT_PUBLIC_INTERNAL_EMAIL_DOMAIN ?? "bimetriks.local";

/** Convierte un username en el email sintético interno (nunca visible al usuario). */
export function usernameToEmail(username: string): string {
  const clean = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
  return `${clean}@${INTERNAL_EMAIL_DOMAIN}`;
}
