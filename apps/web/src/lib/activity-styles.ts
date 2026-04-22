export interface ActivityStyle {
  icon: string;  // path to SVG or emoji fallback
  label: string;
  borderColor: string;
  bgColor: string;
}

export function getActivityStyle(channel: string | null, type: string | null, direction?: string | null): ActivityStyle {
  const ch = (channel || "").toLowerCase();
  const ty = (type || "").toLowerCase();
  const dir = (direction || "").toLowerCase();
  const isOut = dir === "outbound" || ty.includes("outbound") || ty.includes("out");

  // Phone/Call
  if (ch === "phone" || ch === "call" || ty.startsWith("call_")) {
    return isOut
      ? { icon: "/icons/activity/call-out.svg", label: "Call Out", borderColor: "#50E3C2", bgColor: "rgba(80, 227, 197, 0.15)" }
      : { icon: "/icons/activity/call-in.svg", label: "Call In", borderColor: "#50E3C2", bgColor: "rgba(80, 227, 197, 0.15)" };
  }
  // Email
  if (ch === "email" || ty.includes("email")) {
    return isOut
      ? { icon: "/icons/activity/email-out.svg", label: "Email Out", borderColor: "#FF7A00", bgColor: "rgba(255, 122, 0, 0.15)" }
      : { icon: "/icons/activity/email-in.svg", label: "Email In", borderColor: "#FF7A00", bgColor: "rgba(255, 122, 0, 0.15)" };
  }
  // SMS/Text
  if (ch === "sms" || ch === "text" || ty.includes("sms") || ty.includes("text")) {
    return isOut
      ? { icon: "/icons/activity/text-out.svg", label: "Text Out", borderColor: "#C48E48", bgColor: "rgba(87, 71, 49, 0.3)" }
      : { icon: "/icons/activity/text-in.svg", label: "Text In", borderColor: "#C48E48", bgColor: "rgba(87, 71, 49, 0.3)" };
  }
  // Web Form
  if (ch === "webform" || ch === "web_form" || ty === "webform") {
    return { icon: "/icons/activity/webform.svg", label: "Web Form", borderColor: "#FF5E5E", bgColor: "rgba(255, 94, 94, 0.15)" };
  }
  // Meeting/Appointment
  if (ch === "meeting" || ty === "meeting" || ty === "appointment") {
    return { icon: "", label: "Appointment", borderColor: "#92af00", bgColor: "rgba(183, 214, 135, 0.15)" };
  }
  // Mass Email
  if (ty.includes("mass_email") || ty.includes("massemail")) {
    return { icon: "/icons/activity/email-out.svg", label: "Mass Email", borderColor: "#9400ff", bgColor: "rgba(148, 0, 255, 0.15)" };
  }
  // Walk-In
  if (ty.includes("walk") || ch === "walkin" || ch === "walk-in") {
    return { icon: "", label: "Walk-In", borderColor: "#A84264", bgColor: "rgba(168, 66, 100, 0.15)" };
  }
  // Default
  return { icon: "", label: "Activity", borderColor: "#52525b", bgColor: "rgba(82, 82, 91, 0.15)" };
}
