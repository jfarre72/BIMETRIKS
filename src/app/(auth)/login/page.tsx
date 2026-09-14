import { BarChart3, Users, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.15fr_1fr]">
      {/* Panel izquierdo — marca / hero */}
      <section className="login-hero relative hidden flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14">
        <div className="login-dots absolute inset-0 opacity-70" />
        <div className="relative z-10">
          <Logo variant="light" />
        </div>

        <div className="relative z-10 max-w-md">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-white/50">
            Un mismo objetivo · Más posibilidades
          </p>
          <h1 className="text-4xl font-bold leading-tight text-white xl:text-5xl">
            Datos que impulsan{" "}
            <span className="bg-gradient-to-r from-sky to-brand-100 bg-clip-text text-transparent">
              mejores decisiones
            </span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            Un espacio centralizado para gestionar tus proyectos, acceder a reportes y colaborar con tu equipo.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-4">
            <Feature icon={<BarChart3 size={18} />} label="Información en tiempo real" />
            <Feature icon={<Users size={18} />} label="Trabajo colaborativo" />
            <Feature icon={<ShieldCheck size={18} />} label="Datos seguros y confiables" />
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <span className="h-px w-6 bg-lime" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/50">
            Decisiones inteligentes
          </span>
        </div>
      </section>

      {/* Panel derecho — formulario */}
      <section className="flex items-center justify-center bg-canvas p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo variant="dark" />
          </div>
          <h2 className="text-2xl font-bold text-ink">Bienvenido</h2>
          <p className="mt-1 text-sm text-muted">Ingresá a tu cuenta para continuar</p>
          <div className="mt-6">
            <LoginForm />
          </div>
        </div>
      </section>
    </main>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-sky">{icon}</span>
      <span className="text-xs leading-tight text-white/70">{label}</span>
    </div>
  );
}
