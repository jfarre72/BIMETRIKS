import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveProject, listProjects } from "@/lib/project";
import { Sidebar } from "@/components/layout/sidebar";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, active] = await Promise.all([
    supabase.from("profiles").select("username, full_name, role").eq("id", user.id).single(),
    getActiveProject(),
  ]);

  const display = {
    name: profile?.full_name || profile?.username || "Usuario",
    username: profile?.username || "usuario",
  };
  const role = (profile?.role as string) ?? "CLIENT";
  // El staff puede cambiar de cliente; el CLIENT sólo ve el suyo.
  const projects = role === "CLIENT" ? [] : await listProjects();

  return (
    <div className="flex min-h-screen flex-col bg-canvas lg:flex-row">
      <Sidebar user={display} clientName={active.clientName} role={role} projects={projects} activeProjectId={active.id} />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
