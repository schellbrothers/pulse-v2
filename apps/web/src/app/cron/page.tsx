import type { Metadata } from "next";
import CronClient from "./CronClient";

export const metadata: Metadata = {
  title: "Cron — Pulse v2",
};

export default function CronPage() {
  return <CronClient />;
}
