-- =====================================================================
-- Adjuntos para el rol CLIENT
-- El cliente puede subir imágenes / archivos al crear un requerimiento.
-- (La lectura ya estaba habilitada en 0009 y el storage es de lectura pública.)
-- =====================================================================

-- Insert en la tabla de adjuntos de requerimientos.
drop policy if exists req_attachments_client_insert on public.requirement_attachments;
create policy req_attachments_client_insert on public.requirement_attachments
  for insert with check (public.is_client());

-- Subida al bucket de Storage 'attachments'.
drop policy if exists attachments_client_write on storage.objects;
create policy attachments_client_write on storage.objects
  for insert with check (bucket_id = 'attachments' and public.is_client());
