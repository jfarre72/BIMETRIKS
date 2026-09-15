-- =====================================================================
-- Adjuntar la factura a cada bloque de horas contratadas
-- =====================================================================
alter table public.contracted_hours add column if not exists invoice_path text;
alter table public.contracted_hours add column if not exists invoice_name text;

-- Reutiliza el bucket público 'attachments' (prefijo invoices/).
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true)
on conflict (id) do nothing;
