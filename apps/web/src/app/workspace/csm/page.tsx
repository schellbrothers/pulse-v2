import CsmClient from "./CsmClient";

export const revalidate = 30;

// CSM is fully client-side — data fetches based on global filter selection
export default function CsmPage() {
  return <CsmClient />;
}
