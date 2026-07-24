import type { Metadata } from "next";

import { PricingPage } from "@/src/components/forge/refoundation/public/PublicPages";

export const metadata: Metadata = {
  title: "Pricing — FORGE",
  description:
    "The current FORGE build is available without payment; no paid plan, checkout, trial, or subscription is offered here.",
};

export default function PricingRoute() {
  return <PricingPage />;
}
