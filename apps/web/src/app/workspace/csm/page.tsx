import CsmClient from "./CsmClient";

export const dynamic = "force-dynamic";

// CSM is fully client-side — data fetches based on global filter selection
export default function CsmPage() {
  return <CsmClient />;
}
