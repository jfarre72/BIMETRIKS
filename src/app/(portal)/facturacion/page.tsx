import { getBillingBlocks } from "@/lib/queries";
import { requireStaff } from "@/lib/auth";
import { FacturacionClient } from "./facturacion-client";

export const dynamic = "force-dynamic";

export default async function FacturacionPage() {
  await requireStaff();
  const blocks = await getBillingBlocks();
  return <FacturacionClient blocks={blocks} />;
}
