"use client";

import { useCallback } from "react";

import { PrimarySourceReasoningWorld } from "@/src/components/worlds/primary-source-reasoning";
import {
  recordWorldRuntimeReceipt,
  type WorldRuntimeReceiptRecording,
} from "@/src/lib/forge-evidence";

export function PrimarySourceWorldRoute() {
  const recordReceipt = useCallback((recording: WorldRuntimeReceiptRecording) => {
    recordWorldRuntimeReceipt(recording);
  }, []);

  return <PrimarySourceReasoningWorld onRuntimeReceipt={recordReceipt} />;
}
