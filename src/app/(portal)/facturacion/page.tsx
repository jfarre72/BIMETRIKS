import { getBillingBlocks } from "@/lib/queries";
import { FacturacionClient } from "./facturacion-client";

export const dynamic = "force-dynamic";

export default async function FacturacionPage() {
  const blocks = await getBillingBlocks();
  return <FacturacionClient blocks={blocks} />;
}
