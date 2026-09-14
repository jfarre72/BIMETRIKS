# BiMetriks · Portal de Proyectos

Portal interno de BiMetriks para centralizar la gestión de servicios/proyectos de
Data & Analytics: backlog de requerimientos, sprints, tracking con timeline,
gestión de horas contratadas/consumidas y reportería ejecutiva.

> **Etapa 1 (MVP)** — un único cliente/proyecto, un usuario **ADMIN**.
> La arquitectura de datos ya contempla multi-cliente, multi-proyecto y roles
> (ADMIN / CONSULTANT / CLIENT) para habilitarlos sin rehacer la app.

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Supabase** (PostgreSQL + Auth) con **RLS**
- **Tailwind CSS** (Design System BiMetriks)
- **Recharts** para visualizaciones
- Deploy en **Vercel**

## Puesta en marcha

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Configurar variables de entorno (copiar `.env.example` → `.env.local`) con las
   credenciales de tu proyecto Supabase.

3. Aplicar el esquema y los datos base en Supabase (SQL Editor o CLI):
   ```
   supabase/migrations/0001_init.sql   # tablas, vistas, RLS, triggers
   supabase/seed.sql                   # cliente, proyecto y catálogos base
   ```

4. Crear el usuario administrador (usa el service_role key):
   ```bash
   node scripts/create-admin.mjs admin "TuPasswordSegura" "Juan Farré"
   ```

5. Levantar el entorno de desarrollo:
   ```bash
   npm run dev
   ```
   Ingresar en `http://localhost:3000/login` con **usuario** y **contraseña**.

## Login por usuario (sin email visible)

La UI pide **usuario + contraseña**. Supabase Auth requiere un email internamente,
por lo que se genera uno sintético `usuario@bimetriks.local` que **nunca** se
muestra ni se usa como mecanismo de acceso. Las contraseñas las hashea Supabase
(nunca se guardan en texto plano). No hay registro público ni recuperación de
contraseña: los usuarios se crean internamente.

## Estructura

```
src/
├─ app/
│  ├─ (auth)/login/        Pantalla de login (branding BiMetriks)
│  └─ (portal)/            Portal protegido (sidebar fijo)
│     ├─ page.tsx          Inicio / Dashboard ejecutivo
│     ├─ backlog/          Backlog + nuevo requerimiento + acciones masivas
│     ├─ sprints/          Sprints (cards) + detalle
│     ├─ tracking/         Selector + ficha con timeline manual
│     ├─ horas/            Horas contratadas / consumidas + historial
│     └─ reporteria/       Reportes ejecutivos (Recharts)
├─ components/             Design System (ui), layout, dashboard, shared
├─ lib/
│  ├─ supabase/            Clients (browser, server, middleware)
│  ├─ queries.ts           Lecturas (server)
│  ├─ actions.ts           Mutaciones (Server Actions + Zod)
│  └─ types.ts             Tipos de dominio
supabase/
├─ migrations/0001_init.sql
└─ seed.sql
scripts/create-admin.mjs
```

## Modelo de datos (resumen)

`clients → projects → { requirements, sprints, contracted_hours, time_entries }`,
catálogos configurables (`areas`, `req_statuses`, `req_priorities`, `req_types`),
relación N:N `sprint_requirements`, y `requirement_notes` para el **timeline manual**.
Las horas consumidas/disponibles se **calculan** con vistas SQL
(`v_project_hours`, `v_requirement_hours`, `v_sprint_hours`) — nunca se duplican.

## No incluido en esta etapa (por diseño)

Portal del cliente, roles ampliados, emails/notificaciones, adjuntos, multi-cliente
en UI, login social. La base ya está preparada para incorporarlos más adelante.
