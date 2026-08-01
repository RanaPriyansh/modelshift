#!/usr/bin/env python3
"""Commit one bounded receipt relative to an inherited trusted directory fd."""

import hashlib
import json
import os
import secrets
import stat
import sys
from typing import Dict, List, Optional, Tuple


MAX_INPUT_BYTES = 64 * 1024
MAX_STDERR_BYTES = 1024
MAX_STDOUT_BYTES = 4096
MAX_BASENAME_LENGTH = 128
MAX_DIGEST_LENGTH = 64
MAX_TEMP_ATTEMPTS = 8
TEMP_PREFIX = ".forge-browser-receipt.tmp-"
SAFE_BASENAME = set("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._-")


def fail(message: str) -> int:
    encoded = (message[:MAX_STDERR_BYTES - 1] + "\n").encode("utf-8", "replace")
    sys.stderr.buffer.write(encoded[:MAX_STDERR_BYTES])
    sys.stderr.buffer.flush()
    return 2


def parse_arguments(arguments: List[str]) -> Tuple[int, str, int, int, int, str]:
    if len(arguments) != 12:
        raise ValueError("invalid helper arguments")
    values: Dict[str, str] = {}
    for index in range(0, len(arguments), 2):
        key = arguments[index]
        value = arguments[index + 1]
        if key not in {
            "--dir-fd",
            "--basename",
            "--expected-dev",
            "--expected-ino",
            "--byte-count",
            "--sha256",
        }:
            raise ValueError("invalid helper argument")
        if key in values:
            raise ValueError("duplicate helper argument")
        values[key] = value
    expected_keys = {
        "--dir-fd",
        "--basename",
        "--expected-dev",
        "--expected-ino",
        "--byte-count",
        "--sha256",
    }
    if set(values) != expected_keys:
        raise ValueError("incomplete helper arguments")
    if values["--dir-fd"] != "3":
        raise ValueError("invalid directory descriptor")
    basename = values["--basename"]
    if (
        not basename
        or len(basename) > MAX_BASENAME_LENGTH
        or basename in {".", ".."}
        or any(character not in SAFE_BASENAME for character in basename)
    ):
        raise ValueError("invalid receipt basename")
    try:
        expected_dev = int(values["--expected-dev"], 10)
        expected_ino = int(values["--expected-ino"], 10)
        expected_count = int(values["--byte-count"], 10)
    except ValueError as error:
        raise ValueError("invalid descriptor or byte count") from error
    if expected_dev < 0 or expected_ino < 0 or expected_count <= 0 or expected_count > MAX_INPUT_BYTES:
        raise ValueError("invalid descriptor or byte count")
    expected_digest = values["--sha256"]
    if (
        len(expected_digest) != MAX_DIGEST_LENGTH
        or any(character not in "0123456789abcdef" for character in expected_digest)
    ):
        raise ValueError("invalid receipt digest")
    return 3, basename, expected_dev, expected_ino, expected_count, expected_digest


def identity(value: os.stat_result) -> Tuple[int, int]:
    return value.st_dev, value.st_ino


def is_directory(value: os.stat_result) -> bool:
    return stat.S_ISDIR(value.st_mode)


def is_regular_file(value: os.stat_result) -> bool:
    return stat.S_ISREG(value.st_mode)


def same_identity(left: os.stat_result, right: os.stat_result) -> bool:
    return identity(left) == identity(right)


def relative_entry_stat(basename: str, directory_fd: int) -> os.stat_result:
    return os.stat(basename, dir_fd=directory_fd, follow_symlinks=False)


def read_exact(stream, count: int) -> bytes:
    chunks: List[bytes] = []
    remaining = count
    while remaining > 0:
        chunk = stream.read(remaining)
        if not chunk:
            raise ValueError("receipt input ended before its declared size")
        chunks.append(chunk)
        remaining -= len(chunk)
    if stream.read(1):
        raise ValueError("receipt input exceeded its declared size")
    return b"".join(chunks)


def read_descriptor_exact(receipt_fd: int, count: int) -> bytes:
    os.lseek(receipt_fd, 0, os.SEEK_SET)
    chunks: List[bytes] = []
    remaining = count
    while remaining > 0:
        chunk = os.read(receipt_fd, remaining)
        if not chunk:
            raise OSError("receipt descriptor ended before its declared size")
        chunks.append(chunk)
        remaining -= len(chunk)
    if os.read(receipt_fd, 1):
        raise OSError("receipt descriptor exceeded its declared size")
    os.lseek(receipt_fd, 0, os.SEEK_END)
    return b"".join(chunks)


def write_all(receipt_fd: int, payload: bytes) -> None:
    view = memoryview(payload)
    offset = 0
    while offset < len(view):
        written = os.write(receipt_fd, view[offset:])
        if written <= 0:
            raise OSError("receipt write made no progress")
        offset += written


def require_descriptor_support() -> None:
    if not hasattr(os, "O_NOFOLLOW") or not hasattr(os, "open"):
        raise OSError("required descriptor support is unavailable")
    supports_dir_fd = getattr(os, "supports_dir_fd", set())
    supports_follow_symlinks = getattr(os, "supports_follow_symlinks", set())
    if (
        os.open not in supports_dir_fd
        or os.stat not in supports_dir_fd
        or os.link not in supports_dir_fd
        or os.unlink not in supports_dir_fd
        or os.stat not in supports_follow_symlinks
        or os.link not in supports_follow_symlinks
    ):
        raise OSError("required dir_fd support is unavailable")


def create_temporary_receipt(directory_fd: int) -> Tuple[str, int]:
    flags = os.O_RDWR | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW
    for _ in range(MAX_TEMP_ATTEMPTS):
        basename = TEMP_PREFIX + secrets.token_hex(16)
        try:
            return basename, os.open(basename, flags, 0o600, dir_fd=directory_fd)
        except FileExistsError:
            continue
    raise OSError("could not create a unique temporary receipt")


def main() -> int:
    directory_fd: Optional[int] = None
    temporary_basename: Optional[str] = None
    receipt_fd: Optional[int] = None
    try:
        (
            directory_fd,
            basename,
            expected_dev,
            expected_ino,
            expected_count,
            expected_digest,
        ) = parse_arguments(sys.argv[1:])
        payload = read_exact(sys.stdin.buffer, expected_count)
        if hashlib.sha256(payload).hexdigest() != expected_digest:
            raise ValueError("receipt input digest did not match its declaration")
        require_descriptor_support()

        directory_before = os.fstat(directory_fd)
        if not is_directory(directory_before) or identity(directory_before) != (expected_dev, expected_ino):
            raise OSError("trusted directory identity changed before receipt open")

        temporary_basename, receipt_fd = create_temporary_receipt(directory_fd)
        receipt_before = os.fstat(receipt_fd)
        receipt_entry_before = relative_entry_stat(temporary_basename, directory_fd)
        if (
            not is_regular_file(receipt_before)
            or receipt_before.st_size != 0
            or not is_regular_file(receipt_entry_before)
            or not same_identity(receipt_before, receipt_entry_before)
        ):
            raise OSError("temporary receipt descriptor did not match before write")

        write_all(receipt_fd, payload)
        os.fsync(receipt_fd)

        directory_after_sync = os.fstat(directory_fd)
        receipt_after_sync = os.fstat(receipt_fd)
        receipt_entry_after_sync = relative_entry_stat(temporary_basename, directory_fd)
        actual_payload = read_descriptor_exact(receipt_fd, expected_count)
        actual_digest = hashlib.sha256(actual_payload).hexdigest()
        if (
            not is_directory(directory_after_sync)
            or identity(directory_after_sync) != (expected_dev, expected_ino)
            or not same_identity(directory_before, directory_after_sync)
            or not is_regular_file(receipt_after_sync)
            or not same_identity(receipt_before, receipt_after_sync)
            or receipt_after_sync.st_size != expected_count
            or not is_regular_file(receipt_entry_after_sync)
            or not same_identity(receipt_after_sync, receipt_entry_after_sync)
            or receipt_entry_after_sync.st_size != expected_count
            or actual_digest != expected_digest
        ):
            raise OSError("temporary receipt changed after fsync")

        os.link(
            temporary_basename,
            basename,
            src_dir_fd=directory_fd,
            dst_dir_fd=directory_fd,
            follow_symlinks=False,
        )
        final_entry = relative_entry_stat(basename, directory_fd)
        if (
            not is_regular_file(final_entry)
            or not same_identity(receipt_after_sync, final_entry)
            or final_entry.st_size != expected_count
        ):
            raise OSError("receipt final entry did not match the temporary descriptor")
        os.unlink(temporary_basename, dir_fd=directory_fd)
        temporary_basename = None

        directory_after_commit = os.fstat(directory_fd)
        final_entry_after_cleanup = relative_entry_stat(basename, directory_fd)
        if (
            not is_directory(directory_after_commit)
            or identity(directory_after_commit) != (expected_dev, expected_ino)
            or not same_identity(directory_after_sync, directory_after_commit)
            or not is_regular_file(final_entry_after_cleanup)
            or not same_identity(receipt_after_sync, final_entry_after_cleanup)
            or final_entry_after_cleanup.st_size != expected_count
            or final_entry_after_cleanup.st_nlink != 1
        ):
            raise OSError("receipt final entry changed after temporary cleanup")

        result = {
            "directory": {
                "dev": str(directory_after_commit.st_dev),
                "ino": str(directory_after_commit.st_ino),
            },
            "receipt": {
                "dev": str(receipt_after_sync.st_dev),
                "ino": str(receipt_after_sync.st_ino),
                "size": final_entry_after_cleanup.st_size,
                "digest": actual_digest,
            },
        }
        output = json.dumps(result, separators=(",", ":")).encode("ascii") + b"\n"
        if len(output) > MAX_STDOUT_BYTES:
            raise OSError("helper output exceeded its bound")
        sys.stdout.buffer.write(output)
        sys.stdout.buffer.flush()
        return 0
    except Exception as error:
        return fail(f"exclusive receipt helper failed: {error}")
    finally:
        if temporary_basename is not None and directory_fd is not None:
            try:
                os.unlink(temporary_basename, dir_fd=directory_fd)
            except FileNotFoundError:
                pass
        if receipt_fd is not None:
            try:
                os.close(receipt_fd)
            except OSError:
                pass


if __name__ == "__main__":
    sys.exit(main())
