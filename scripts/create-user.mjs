/**
 * Crea un usuario de BiMetriks con un rol determinado.
 *
 * Uso:
 *   node scripts/create-user.mjs <username> <password> <ROLE> ["Nombre Completo"]
 *
 *   ROLE = ADMIN | CONSULTANT | CLIENT
 *
 * Ejemplo (alta del cliente Samboro):
 *   node scripts/create-user.mjs samboro bi2026 CLIENT "Samboro"
 *
 * Requiere en el entorno:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY            (service role, NUNCA en el cliente)
 *   NEXT_PUBLIC_INTERNAL_EMAIL_DOMAIN    (opcional, default bimetriks.local)
 *
 * Para el rol CLIENT, el perfil queda ligado al primer cliente cargado
 * (client_id), que en el MVP es Samboro.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const domain = process.env.NEXT_PUBLIC_INTERNAL_EMAIL_DOMAIN ?? "bimetriks.local";

const [, , username, password, roleArg, ...nameParts] = process.argv;
const role = (roleArg ?? "").toUpperCase();
const fullName = nameParts.join(" ") || username;

const VALID_ROLES = ["ADMIN", "CONSULTANT", "CLIENT"];

if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.");
  process.exit(1);
}
if (!username || !password || !VALID_ROLES.includes(role)) {
  console.error('Uso: node scripts/create-user.mjs <username> <password> <ADMIN|CONSULTANT|CLIENT> ["Nombre"]');
  process.exit(1);
}

const email = `${username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "")}@${domain}`;
const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

// Para CLIENT, ligamos el perfil al primer cliente cargado (Samboro en el MVP).
let clientId = null;
if (role === "CLIENT") {
  const { data: client } = await supabase
    .from("clients")
    .select("id,name")
    .order("created_at", { ascending: true })
    .limit(1)
    .single();
  clientId = client?.id ?? null;
  if (!clientId) {
    console.error("No se encontró ningún cliente en la base para ligar el perfil CLIENT.");
    process.exit(1);
  }
  console.log(`→ Ligando el perfil al cliente "${client.name}".`);
}

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
  role,
  client_id: clientId,
});

if (profileError) {
  console.error("Usuario creado pero falló el perfil:", profileError.message);
  process.exit(1);
}

console.log(`✓ Usuario "${username}" creado con rol ${role} (email interno ${email}).`);
