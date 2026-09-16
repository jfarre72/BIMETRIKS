import { getProjectId } from "@/lib/project";
import { getProjectDocuments } from "@/lib/queries";
import { requireStaff } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardBody } from "@/components/ui";
import { DocumentUploader } from "@/components/shared/document-uploader";

export const dynamic = "force-dynamic";

export default async function DocumentacionPage() {
  await requireStaff();
  const [projectId, docs] = await Promise.all([getProjectId(), getProjectDocuments()]);
  return (
    <div>
      <PageHeader title="Documentación" subtitle="Archivos del proyecto: relevamientos, PDFs, planillas y más" />
      <Card>
        <CardBody>
          <DocumentUploader projectId={projectId} initial={docs as any} />
        </CardBody>
      </Card>
    </div>
  );
}
