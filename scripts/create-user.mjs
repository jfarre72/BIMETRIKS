/**
 * Crea un usuario de BiMetriks con un rol determinado.
 *
 * Uso:
 *   node scripts/create-user.mjs <username> <password> <ROLE> ["Nombre Completo"] [--cliente "Nombre Cliente"]
 *
 *   ROLE = ADMIN | CONSULTANT | CLIENT
 *
 * Ejemplo (usuario del cliente NAIKA):
 *   node scripts/create-user.mjs naika Clave2026 CLIENT "Usuario NAIKA" --cliente "NAIKA"
 *
 * Requiere en el entorno:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY            (service role, NUNCA en el cliente)
 *   NEXT_PUBLIC_INTERNAL_EMAIL_DOMAIN    (opcional, default bimetriks.local)
 *
 * Para el rol CLIENT, el perfil queda ligado al cliente indicado con
 * --cliente (por nombre, sin distinguir mayúsculas). Sólo verá ese cliente.
 * Si hay un único cliente cargado, --cliente es opcional.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const domain = process.env.NEXT_PUBLIC_INTERNAL_EMAIL_DOMAIN ?? "bimetriks.local";

const argv = process.argv.slice(2);
const clientFlag = argv.indexOf("--cliente");
const clientArg = clientFlag >= 0 ? argv[clientFlag + 1] : null;
if (clientFlag >= 0) argv.splice(clientFlag, 2);
const [username, password, roleArg, ...nameParts] = argv;
const role = (roleArg ?? "").toUpperCase();
const fullName = nameParts.join(" ") || username;

const VALID_ROLES = ["ADMIN", "CONSULTANT", "CLIENT"];

if (!url || !serviceKey) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.");
  process.exit(1);
}
if (!username || !password || !VALID_ROLES.includes(role)) {
  console.error('Uso: node scripts/create-user.mjs <username> <password> <ADMIN|CONSULTANT|CLIENT> ["Nombre"] [--cliente "Cliente"]');
  process.exit(1);
}

const email = `${username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "")}@${domain}`;
const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

// Para CLIENT, ligamos el perfil al cliente indicado con --cliente.
let clientId = null;
if (role === "CLIENT") {
  const { data: clients } = await supabase.from("clients").select("id,name").order("created_at", { ascending: true });
  const all = clients ?? [];
  let client = null;
  if (clientArg) {
    client = all.find((c) => c.name.trim().toLowerCase() === clientArg.trim().toLowerCase()) ?? null;
    if (!client) {
      console.error(`No existe el cliente "${clientArg}". Clientes cargados: ${all.map((c) => c.name).join(", ") || "(ninguno)"}`);
      process.exit(1);
    }
  } else if (all.length === 1) {
    client = all[0];
  } else {
    console.error(`Indicá el cliente con --cliente "Nombre". Clientes cargados: ${all.map((c) => c.name).join(", ") || "(ninguno)"}`);
    process.exit(1);
  }
  clientId = client.id;
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
