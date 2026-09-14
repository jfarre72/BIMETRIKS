import { BarChart3, Users, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { IsoCube } from "@/components/brand/iso-cube";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.15fr_1fr]">
      {/* Panel izquierdo — marca / hero */}
      <section className="login-hero relative hidden flex-col justify-between overflow-hidden p-10 lg:flex xl:p-14">
        <div className="login-dots absolute inset-0 opacity-70" />
        {/* Cubo isométrico decorativo */}
        <IsoCube className="pointer-events-none absolute -right-6 top-16 z-0 h-72 w-72 opacity-90 xl:right-6 xl:h-96 xl:w-96" />
        {/* Textos técnicos flotantes */}
        <span className="absolute right-10 top-1/2 z-0 -translate-y-1/2 text-right text-[10px] font-semibold uppercase leading-loose tracking-[0.3em] text-white/25">
          Analyze<br />Plan<br />Grow
        </span>

        <div className="relative z-10 flex items-center justify-between">
          <Logo variant="light" />
          <span className="hidden text-right text-[10px] font-semibold uppercase leading-relaxed tracking-[0.28em] text-white/40 xl:block">
            Un mismo objetivo<br />Más posibilidades
          </span>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="text-4xl font-bold leading-[1.1] text-white xl:text-5xl">
            Datos que<br />impulsan{" "}
            <span className="bg-gradient-to-r from-sky to-brand-100 bg-clip-text text-transparent">
              mejores decisiones
            </span>
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
            Un espacio centralizado para gestionar tus proyectos, acceder a reportes y colaborar con tu equipo.
          </p>

          <div className="mt-8 grid max-w-md grid-cols-3 gap-4">
            <Feature icon={<BarChart3 size={18} />} label="Información en tiempo real" />
            <Feature icon={<Users size={18} />} label="Trabajo colaborativo" />
            <Feature icon={<ShieldCheck size={18} />} label="Datos seguros y confiables" />
          </div>
        </div>

        <div className="relative z-10 flex items-end justify-between">
          <div className="flex items-center gap-2">
            <span className="h-px w-6 bg-lime" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-white/50">
              Decisiones inteligentes
            </span>
          </div>
          <span className="text-right text-[10px] font-semibold uppercase leading-relaxed tracking-[0.3em] text-white/30">
            People<br />Data<br />Impact
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
