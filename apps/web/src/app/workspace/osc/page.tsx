import OscClient from "./OscClient";

export const revalidate = 30;

// OSC is fully client-side — data fetches based on global division filter
export default function OscPage() {
  return <OscClient />;
}
