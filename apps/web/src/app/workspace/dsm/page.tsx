import DsmClient from "./DsmClient";

export const revalidate = 30;

export default async function DsmPage() {
  // Stub stats — will be replaced with live Supabase queries
  const stats = {
    totalLeads: 0,
    totalOpportunities: 0,
    totalProspects: 0,
    totalCustomers: 0,
    conversionRate: 0,
  };

  // TODO: fetch pipeline data by community from Supabase
  const pipeline: never[] = [];

  return <DsmClient stats={stats} pipeline={pipeline} />;
}
