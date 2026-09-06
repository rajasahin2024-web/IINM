import { serverFetch, isDbDown } from "@/lib/serverFetch";
import CertificationClientView from "./CertificationClientView";

export const revalidate = 60; // ISR cache 60s

export default async function CertificationPage() {
  const certData = await serverFetch("/certification/data", revalidate);
  const initialData = certData && !isDbDown(certData) ? (certData as any) : {};

  return <CertificationClientView initialData={initialData} />;
}
