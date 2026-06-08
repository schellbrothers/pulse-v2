import OscClient from "./OscClient";

export const dynamic = "force-dynamic";

// OSC is fully client-side — data fetches based on global division filter
export default function OscPage() {
  return <OscClient />;
}
