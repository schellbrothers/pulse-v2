import OscClient from "./OscClient";

export const revalidate = 30;

export default async function OscPage() {
  // Stub stats — will be replaced with live Supabase queries
  const stats = {
    newOpportunities: 0,
    assignedToday: 0,
    routedToday: 0,
    avgResponseMin: 0,
  };

  // TODO: fetch leads WHERE crm_stage = 'opportunity' from Supabase
  const recentOpportunities: never[] = [];

  return <OscClient stats={stats} recentOpportunities={recentOpportunities} />;
}
