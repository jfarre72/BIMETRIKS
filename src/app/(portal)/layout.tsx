import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getClientName } from "@/lib/queries";
import { Sidebar } from "@/components/layout/sidebar";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, clientName] = await Promise.all([
    supabase.from("profiles").select("username, full_name").eq("id", user.id).single(),
    getClientName(),
  ]);

  const display = {
    name: profile?.full_name || profile?.username || "Usuario",
    username: profile?.username || "usuario",
  };

  return (
    <div className="flex min-h-screen flex-col bg-canvas lg:flex-row">
      <Sidebar user={display} clientName={clientName} />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
