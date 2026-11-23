import type { Metadata } from "next";
import { Verify } from "@/components/verify/Verify";

export const metadata: Metadata = { title: "Textbook check · Hive Lab" };

export default function VerifyPage() {
  return <Verify />;
}
