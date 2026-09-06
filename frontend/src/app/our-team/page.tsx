import { serverFetch, isDbDown } from "@/lib/serverFetch";
import OurTeamClientView from "./OurTeamClientView";

export const revalidate = 60; // ISR cache 60s

export default async function OurTeamPage() {
  const teamData = await serverFetch("/our-team/data", revalidate);
  const initialData = teamData && !isDbDown(teamData) ? (teamData as any) : {};

  return <OurTeamClientView initialData={initialData} />;
}
