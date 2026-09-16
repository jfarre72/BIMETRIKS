/**
 * Resetea la contraseña de un usuario (sin depender del email, que es sintético).
 *
 * Uso:
 *   node scripts/reset-password.mjs <username> <nueva_password>
 *
 * Ejemplo:
 *   node scripts/reset-password.mjs samboro nuevaClave2026
 *
 * Requiere en el entorno:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY            (service role, NUNCA en el cliente)
 *   NEXT_PUBLIC_INTERNAL_EMAIL_DOMAIN    (opcional, default bimetriks.local)
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const domain = process.env.NEXT_PUBLIC_INTERNAL_EMAIL_DOMAIN ?? "bimetriks.local";

const [, , username, newPassword] = process.argv;

if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.");
  process.exit(1);
}
if (!username || !newPassword) {
  console.error("Uso: node scripts/reset-password.mjs <username> <nueva_password>");
  process.exit(1);
}

const email = `${username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "")}@${domain}`;
const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

// Buscamos el usuario por email (paginando la lista de Auth).
let userId = null;
for (let page = 1; page <= 20 && !userId; page++) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
  if (error) { console.error("Error listando usuarios:", error.message); process.exit(1); }
  const found = data.users.find((u) => (u.email ?? "").toLowerCase() === email);
  if (found) userId = found.id;
  if (data.users.length < 200) break; // última página
}

if (!userId) {
  console.error(`No se encontró el usuario "${username}" (${email}).`);
  process.exit(1);
}

const { error } = await supabase.auth.admin.updateUserById(userId, { password: newPassword });
if (error) {
  console.error("Error actualizando la contraseña:", error.message);
  process.exit(1);
}

console.log(`✓ Contraseña de "${username}" actualizada.`);
