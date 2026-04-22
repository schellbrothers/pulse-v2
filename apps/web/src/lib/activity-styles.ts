export interface ActivityStyle {
  icon: string;
  label: string;
  borderColor: string;
  bgColor: string;
}

export function getActivityStyle(channel: string | null, type: string | null, direction?: string | null): ActivityStyle {
  const ch = (channel || "").toLowerCase();
  const ty = (type || "").toLowerCase();
  const dir = (direction || "").toLowerCase();

  if (ch === "phone" || ch === "call" || ty.startsWith("call_")) {
    const isOut = dir === "outbound" || ty.includes("outbound");
    return isOut
      ? { icon: "↗📞", label: "Call Out", borderColor: "#22c55e", bgColor: "rgba(34,197,94,0.08)" }
      : { icon: "↙📞", label: "Call In", borderColor: "#22c55e", bgColor: "rgba(34,197,94,0.08)" };
  }
  if (ch === "email" || ty.includes("email")) {
    const isOut = dir === "outbound" || ty.includes("outbound");
    return isOut
      ? { icon: "↗✉️", label: "Email Out", borderColor: "#f97316", bgColor: "rgba(249,115,22,0.08)" }
      : { icon: "↙✉️", label: "Email In", borderColor: "#f97316", bgColor: "rgba(249,115,22,0.08)" };
  }
  if (ch === "sms" || ch === "text" || ty.includes("sms")) {
    const isOut = dir === "outbound" || ty.includes("outbound");
    return isOut
      ? { icon: "↗💬", label: "Text Out", borderColor: "#22c55e", bgColor: "rgba(34,197,94,0.08)" }
      : { icon: "↙💬", label: "Text In", borderColor: "#22c55e", bgColor: "rgba(34,197,94,0.08)" };
  }
  if (ch === "webform" || ch === "web_form" || ty === "webform") {
    return { icon: "📋", label: "Web Form", borderColor: "#a16207", bgColor: "rgba(161,98,7,0.08)" };
  }
  if (ch === "meeting" || ty === "meeting" || ty === "appointment") {
    return { icon: "📅", label: "Appointment", borderColor: "#22c55e", bgColor: "rgba(34,197,94,0.08)" };
  }
  return { icon: "📌", label: "Activity", borderColor: "#52525b", bgColor: "rgba(82,82,91,0.08)" };
}
