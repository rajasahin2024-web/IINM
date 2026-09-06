import { serverFetch, isDbDown } from "@/lib/serverFetch";
import MissionVisionClientView from "./MissionVisionClientView";

export const revalidate = 60; // ISR cache 60s

export default async function MissionVisionPage() {
  const mvData = await serverFetch("/mission-vision/data", revalidate);
  const initialData = mvData && !isDbDown(mvData) ? (mvData as any) : {};

  return <MissionVisionClientView initialData={initialData} />;
}
