"use client";

import { useCallback } from "react";

import { ProportionalReasoningWorld } from "@/src/components/worlds/proportional-reasoning";
import { recordWorldRuntimeReceipt } from "@/src/lib/forge-evidence";
import type { RatioAudience } from "@/src/worlds/proportional-reasoning";

export function ProportionalWorldRoute({ audience }: { audience: RatioAudience }) {
  const recordReceipt = useCallback((receipt: Parameters<typeof recordWorldRuntimeReceipt>[0]) => {
    recordWorldRuntimeReceipt(receipt);
  }, []);

  return <ProportionalReasoningWorld audience={audience} onRuntimeReceipt={recordReceipt} />;
}
