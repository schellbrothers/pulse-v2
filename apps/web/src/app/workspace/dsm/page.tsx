import DsmClient from "./DsmClient";

export const dynamic = "force-dynamic";

// DSM is fully client-side — data fetches based on global filter selection
export default function DsmPage() {
  return <DsmClient />;
}
