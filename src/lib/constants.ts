// Para el MVP trabajamos con un único proyecto. El id coincide con el seed.
// Cuando se habilite multi-proyecto, esto se resuelve por sesión/selección.
export const PROJECT_ID = "00000000-0000-0000-0000-0000000000b1";
export const CLIENT_ID = "00000000-0000-0000-0000-0000000000c1";

export const INTERNAL_EMAIL_DOMAIN =
  process.env.NEXT_PUBLIC_INTERNAL_EMAIL_DOMAIN ?? "bimetriks.local";

/** Convierte un username en el email sintético interno (nunca visible al usuario). */
export function usernameToEmail(username: string): string {
  const clean = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
  return `${clean}@${INTERNAL_EMAIL_DOMAIN}`;
}
