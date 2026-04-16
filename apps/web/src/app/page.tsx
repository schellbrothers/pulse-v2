import { redirect } from "next/navigation";

// Overview removed — redirect to OSC command center (default workspace)
export default function RootPage() {
  redirect("/workspace/osc");
}
