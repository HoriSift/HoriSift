/** Re-check a discovered path before loading untrusted source. Never execute it. */
import { constants } from 'node:fs';
import { lstat, open, realpath } from 'node:fs/promises';
import { isAbsolute, join, resolve, sep } from 'node:path';
import type { DiscoveryLimits } from '../scanner/discover.ts';

export interface ReadDiagnostic {
  code: 'INVALID_PATH' | 'INVALID_ROOT' | 'SYMLINK_SKIPPED' | 'PATH_OUTSIDE_ROOT' | 'FILE_CHANGED' | 'FILE_UNREADABLE' | 'FILE_TOO_LARGE' | 'INVALID_ENCODING';
  file: string | null;
  message: string;
}
export type ReadResult =
  | { status: 'ok'; path: string; source: string; sizeBytes: number }
  | { status: 'incomplete'; diagnostic: ReadDiagnostic };

export interface ReadOptions {
  maxFileBytes?: DiscoveryLimits['maxFileBytes'];
  /** Only for deterministic fault injection in tests; never imports scanned code. */
  io?: Partial<{ lstat: typeof lstat; realpath: typeof realpath; open: typeof open }>;
}
const MESSAGES: Record<ReadDiagnostic['code'], string> = {
  INVALID_PATH: 'Source path is not a safe root-relative path.',
  INVALID_ROOT: 'Scan root is not a real directory.',
  SYMLINK_SKIPPED: 'A symbolic link was refused.',
  PATH_OUTSIDE_ROOT: 'Resolved path falls outside the scan root.',
  FILE_CHANGED: 'Source changed or is not a regular file.',
  FILE_UNREADABLE: 'Source cannot be read.',
  FILE_TOO_LARGE: 'Source exceeds configured file byte limit.',
  INVALID_ENCODING: 'Source is not valid UTF-8 or contains a NUL byte.',
};
const contained = (root: string, child: string): boolean => {
  const a = process.platform === 'win32' ? root.toLowerCase() : root;
  const b = process.platform === 'win32' ? child.toLowerCase() : child;
  return b === a || b.startsWith(a.endsWith(sep) ? a : a + sep);
};
const validRelative = (p: unknown): p is string => typeof p === 'string' && p.length > 0 && p.length <= 1024 &&
  !isAbsolute(p) && !p.includes('\\') && !p.startsWith('/') &&
  p.split('/').every(x => x && x !== '.' && x !== '..' && !/[\x00-\x1f\x7f]/.test(x));

export async function readSourceFile(rootPath: string, relativePath: string, options: ReadOptions = {}): Promise<ReadResult> {
  const fail = (code: ReadDiagnostic['code'], file: string | null): ReadResult => ({ status: 'incomplete', diagnostic: { code, file, message: MESSAGES[code] } });
  if (!validRelative(relativePath)) return fail('INVALID_PATH', null);
  if (typeof rootPath !== 'string' || !rootPath || rootPath.includes('\0')) return fail('INVALID_ROOT', null);
  const maxFileBytes = options.maxFileBytes ?? 1024 * 1024;
  if (!Number.isSafeInteger(maxFileBytes) || maxFileBytes < 1 || maxFileBytes > 64 * 1024 * 1024) throw new TypeError('Invalid read configuration');
  const io = { lstat, open, realpath, ...options.io };
  const rootAbs = resolve(rootPath);
  let root: string;
  try {
    const stat = await io.lstat(rootAbs);
    if (!stat.isDirectory() || stat.isSymbolicLink()) return fail('INVALID_ROOT', null);
    root = await io.realpath(rootAbs);
  } catch { return fail('INVALID_ROOT', null); }
  const parts = relativePath.split('/');
  let abs = root;
  for (const part of parts) {
    abs = join(abs, part);
    try {
      const st = await io.lstat(abs);
      if (st.isSymbolicLink()) return fail('SYMLINK_SKIPPED', relativePath);
    } catch { return fail('FILE_UNREADABLE', relativePath); }
  }
  try {
    const canonical = await io.realpath(abs);
    if (!contained(root, canonical)) return fail('PATH_OUTSIDE_ROOT', relativePath);
  } catch { return fail('FILE_UNREADABLE', relativePath); }
  let fh;
  try { fh = await io.open(abs, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0)); }
  catch { return fail('FILE_UNREADABLE', relativePath); }
  try {
    const st = await fh.stat();
    if (!st.isFile()) return fail('FILE_CHANGED', relativePath);
    if (st.size > maxFileBytes) return fail('FILE_TOO_LARGE', relativePath);
    // Fixed maximum allocation and strict cap, even if file grows during reads.
    const buffer = Buffer.allocUnsafe(maxFileBytes + 1);
    let offset = 0;
    while (offset < buffer.length) {
      const { bytesRead } = await fh.read(buffer, offset, buffer.length - offset, null);
      if (!bytesRead) break;
      offset += bytesRead;
    }
    if (offset > maxFileBytes) return fail('FILE_TOO_LARGE', relativePath);
    const bytes = buffer.subarray(0, offset);
    if (bytes.includes(0)) return fail('INVALID_ENCODING', relativePath);
    try {
      const source = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      return { status: 'ok', path: relativePath, source: source.startsWith('\uFEFF') ? source.slice(1) : source, sizeBytes: offset };
    } catch { return fail('INVALID_ENCODING', relativePath); }
  } catch {
    return fail('FILE_UNREADABLE', relativePath);
  } finally { await fh.close().catch(() => {}); }
}
