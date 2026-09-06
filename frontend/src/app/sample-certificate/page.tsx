import { serverFetch, isDbDown } from "@/lib/serverFetch";
import SampleCertificateClientView from "./SampleCertificateClientView";

export const revalidate = 60; // ISR cache 60s

export default async function SampleCertificatePage() {
  const certData = await serverFetch("/sample-certificate/data", revalidate);
  const initialData = certData && !isDbDown(certData) ? (certData as any) : {};

  return <SampleCertificateClientView initialData={initialData} />;
}
