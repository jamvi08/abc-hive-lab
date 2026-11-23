import type { Metadata } from "next";
import { Race } from "@/components/race/Race";

export const metadata: Metadata = { title: "ABC vs Random Search · Hive Lab" };

export default function RacePage() {
  return <Race />;
}
