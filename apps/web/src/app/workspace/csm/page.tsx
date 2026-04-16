import CsmClient from "./CsmClient";

export const revalidate = 30;

export default async function CsmPage() {
  // Stub stats — will be replaced with live Supabase queries
  const stats = {
    totalProspects: 0,
    prospectA: 0,
    prospectB: 0,
    prospectC: 0,
    appointmentsThisWeek: 0,
  };

  // TODO: fetch prospects WHERE csm_id = current user from Supabase
  const myProspects: never[] = [];

  return <CsmClient stats={stats} myProspects={myProspects} />;
}
