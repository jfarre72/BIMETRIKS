/**
 * Crea el usuario ADMIN inicial de BiMetriks.
 *
 * Uso:
 *   node scripts/create-admin.mjs <username> <password> ["Nombre Completo"]
 *
 * Requiere en el entorno:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (service role, NUNCA en el cliente)
 *   NEXT_PUBLIC_INTERNAL_EMAIL_DOMAIN (opcional, default bimetriks.local)
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const domain = process.env.NEXT_PUBLIC_INTERNAL_EMAIL_DOMAIN ?? "bimetriks.local";

const [, , username, password, ...nameParts] = process.argv;
const fullName = nameParts.join(" ") || "Administrador";

if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.");
  process.exit(1);
}
if (!username || !password) {
  console.error("Uso: node scripts/create-admin.mjs <username> <password> [\"Nombre\"]");
  process.exit(1);
}

const email = `${username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "")}@${domain}`;
const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { username, full_name: fullName },
});

if (error) {
  console.error("Error creando usuario:", error.message);
  process.exit(1);
}

const userId = data.user.id;
const { error: profileError } = await supabase.from("profiles").upsert({
  id: userId,
  username,
  full_name: fullName,
  role: "ADMIN",
});

if (profileError) {
  console.error("Usuario creado pero falló el perfil:", profileError.message);
  process.exit(1);
}

console.log(`✓ Admin creado: usuario "${username}" (email interno ${email})`);
