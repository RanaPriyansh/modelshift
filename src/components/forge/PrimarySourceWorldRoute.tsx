"use client";

import { useCallback } from "react";

import { PrimarySourceReasoningWorld } from "@/src/components/worlds/primary-source-reasoning";
import { recordWorldRuntimeReceipt } from "@/src/lib/forge-evidence";

export function PrimarySourceWorldRoute() {
  const recordReceipt = useCallback((receipt: Parameters<typeof recordWorldRuntimeReceipt>[0]) => {
    recordWorldRuntimeReceipt(receipt);
  }, []);

  return <PrimarySourceReasoningWorld onRuntimeReceipt={recordReceipt} />;
}
