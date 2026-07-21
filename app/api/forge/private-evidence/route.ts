import { NextResponse, type NextRequest } from "next/server";

import { getAdultPrivateEvidenceAccess } from "@/src/lib/forge-auth/server";
import {
  MAX_PRIVATE_EVIDENCE_BODY_BYTES,
  isSameOriginMutation,
  privateEvidenceDeleteRequestSchema,
  privateEvidenceSyncRequestSchema,
  toAdultPrivateEvidenceRows,
} from "@/src/lib/forge-private-evidence/contracts";
import { createClient } from "@/src/lib/supabase/server";

export const runtime = "nodejs";

const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: PRIVATE_RESPONSE_HEADERS });
}

async function readBoundedJson(request: NextRequest): Promise<unknown | null> {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    const declaredLength = Number(contentLength);
    if (!Number.isSafeInteger(declaredLength) || declaredLength < 0 || declaredLength > MAX_PRIVATE_EVIDENCE_BODY_BYTES) {
      return null;
    }
  }

  const reader = request.body?.getReader();
  if (!reader) return null;

  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    receivedBytes += value.byteLength;
    if (receivedBytes > MAX_PRIVATE_EVIDENCE_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const body = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body)) as unknown;
  } catch {
    return null;
  }
}

async function adultContext() {
  const access = await getAdultPrivateEvidenceAccess();
  if (access.status !== "adult") return { access, supabase: null } as const;
  return { access, supabase: await createClient() } as const;
}

function mutationAllowed(request: NextRequest): boolean {
  return isSameOriginMutation(request.url, request.headers.get("origin"));
}

export async function GET() {
  const { access, supabase } = await adultContext();
  if (access.status === "signed_out") return json({ error: "authentication_required" }, 401);
  if (access.status !== "adult" || !supabase) return json({ error: "adult_private_evidence_unavailable" }, 403);

  const { data, error } = await supabase
    .schema("forge")
    .from("adult_private_evidence_entries")
    .select("entry")
    .eq("learner_user_id", access.userId)
    .order("recorded_at", { ascending: false })
    .limit(5_000);

  if (error) return json({ error: "private_evidence_read_failed" }, 503);
  return json({ entries: (data ?? []).map((row) => row.entry) });
}

export async function POST(request: NextRequest) {
  if (!mutationAllowed(request)) return json({ error: "same_origin_required" }, 403);

  const body = await readBoundedJson(request);
  const parsed = privateEvidenceSyncRequestSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid_private_evidence" }, 400);

  const { access, supabase } = await adultContext();
  if (access.status === "signed_out") return json({ error: "authentication_required" }, 401);
  if (access.status !== "adult" || !supabase) return json({ error: "adult_private_evidence_unavailable" }, 403);

  const rows = toAdultPrivateEvidenceRows(access.userId, parsed.data.entries);
  const { error } = await supabase
    .schema("forge")
    .from("adult_private_evidence_entries")
    .upsert(rows, {
      onConflict: "learner_user_id,client_evidence_id",
      ignoreDuplicates: true,
    });

  if (error) return json({ error: "private_evidence_write_failed" }, 503);
  return json({ synced: rows.length });
}

export async function DELETE(request: NextRequest) {
  if (!mutationAllowed(request)) return json({ error: "same_origin_required" }, 403);

  const body = await readBoundedJson(request);
  const parsed = privateEvidenceDeleteRequestSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid_deletion_scope" }, 400);

  const { access, supabase } = await adultContext();
  if (access.status === "signed_out") return json({ error: "authentication_required" }, 401);
  if (access.status !== "adult" || !supabase) return json({ error: "adult_private_evidence_unavailable" }, 403);

  let deletion = supabase
    .schema("forge")
    .from("adult_private_evidence_entries")
    .delete()
    .eq("learner_user_id", access.userId);
  if (parsed.data.entryId) deletion = deletion.eq("client_evidence_id", parsed.data.entryId);

  const { error } = await deletion;
  if (error) return json({ error: "private_evidence_delete_failed" }, 503);
  return json({ deleted: parsed.data.all ? "all" : parsed.data.entryId });
}
