import DsmClient from "./DsmClient";

export const revalidate = 30;

// DSM is fully client-side — data fetches based on global filter selection
export default function DsmPage() {
  return <DsmClient />;
}
