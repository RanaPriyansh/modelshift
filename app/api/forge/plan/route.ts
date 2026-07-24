import { createForgePlanPost } from "../../../../src/lib/forge-planner/route-handler.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = createForgePlanPost();
