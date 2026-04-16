import { redirect } from "next/navigation";

// Redirect to CSM command center (default workspace)
export default function RootPage() {
  redirect("/workspace/csm");
}
