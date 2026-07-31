import { createHash } from "node:crypto";
import {
  closeSync,
  constants,
  fstatSync,
  openSync,
  readFileSync,
} from "node:fs";

type StableFileStat = Readonly<{
  device: bigint;
  inode: bigint;
  size: bigint;
  modifiedAt: bigint;
  changedAt: bigint;
}>;

function stableFileStat(fileDescriptor: number): StableFileStat {
  const stat = fstatSync(fileDescriptor, { bigint: true });
  if (!stat.isFile()) {
    throw new Error("File-tree identity requires regular files.");
  }
  return Object.freeze({
    device: stat.dev,
    inode: stat.ino,
    size: stat.size,
    modifiedAt: stat.mtimeNs,
    changedAt: stat.ctimeNs,
  });
}

/**
 * Read through one non-following descriptor and reject a concurrent mutation.
 * Parent-directory swaps are covered by the caller's containment checks and
 * the verification-to-snapshot rehash.
 */
export function readStableRegularFile(
  path: string,
  maximumBytes = Number.MAX_SAFE_INTEGER,
): Buffer {
  const fileDescriptor = openSync(
    path,
    constants.O_RDONLY | constants.O_NOFOLLOW,
  );
  try {
    const before = stableFileStat(fileDescriptor);
    if (
      !Number.isSafeInteger(maximumBytes)
      || maximumBytes < 0
      || before.size > BigInt(maximumBytes)
    ) {
      throw new Error(
        "File-tree identity rejected a file larger than its byte limit.",
      );
    }
    const bytes = readFileSync(fileDescriptor);
    const after = stableFileStat(fileDescriptor);
    if (
      before.device !== after.device
      || before.inode !== after.inode
      || before.size !== after.size
      || before.modifiedAt !== after.modifiedAt
      || before.changedAt !== after.changedAt
      || BigInt(bytes.length) !== after.size
    ) {
      throw new Error(
        "File-tree identity rejected a file that changed while it was read.",
      );
    }
    return bytes;
  } finally {
    closeSync(fileDescriptor);
  }
}

function lengthPrefix(length: number): Buffer {
  if (!Number.isSafeInteger(length) || length < 0) {
    throw new Error("File-tree identity rejected an invalid record length.");
  }
  const prefix = Buffer.alloc(8);
  prefix.writeBigUInt64BE(BigInt(length));
  return prefix;
}

/**
 * Hash a domain-separated sequence of unambiguous
 * `(path-length, path, content-length, content)` records.
 */
export function framedFileTreeDigest(
  domain: string,
  entries: readonly Readonly<{ path: string; bytes: Buffer }>[],
): string {
  const orderedEntries = [...entries].sort((left, right) =>
    left.path.localeCompare(right.path)
  );
  for (let index = 0; index < orderedEntries.length; index += 1) {
    const entry = orderedEntries[index]!;
    if (
      entry.path.length === 0
      || entry.path.startsWith("/")
      || entry.path.includes("\\")
      || entry.path.includes("\0")
      || entry.path.split("/").some((part) => part === "" || part === "..")
      || (
        index > 0
        && orderedEntries[index - 1]!.path === entry.path
      )
    ) {
      throw new Error(
        "File-tree identity rejected a non-canonical or duplicate path.",
      );
    }
  }
  const hash = createHash("sha256");
  const domainBytes = Buffer.from(domain, "utf8");
  hash.update(lengthPrefix(domainBytes.length));
  hash.update(domainBytes);
  hash.update(lengthPrefix(orderedEntries.length));
  for (const entry of orderedEntries) {
    const pathBytes = Buffer.from(entry.path, "utf8");
    hash.update(lengthPrefix(pathBytes.length));
    hash.update(pathBytes);
    hash.update(lengthPrefix(entry.bytes.length));
    hash.update(entry.bytes);
  }
  return hash.digest("hex");
}
