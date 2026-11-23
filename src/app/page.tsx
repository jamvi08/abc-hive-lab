import { Suspense } from "react";
import { Simulator } from "@/components/sim/Simulator";

export default function Home() {
  return (
    <Suspense fallback={<div className="p-10 text-hive-muted">Loading the hive…</div>}>
      <Simulator />
    </Suspense>
  );
}
