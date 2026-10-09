/**
 * Bounded, local-only source file discovery. No source is parsed or executed.
 * Import with Node 22.12+ `--experimental-strip-types` until the TypeScript
 * compiler is pinned in the parsing milestone.
 */
import { constants } from 'node:fs';
import type { Dirent } from 'node:fs';
import { open, opendir, lstat, realpath } from 'node:fs/promises';
import { extname, isAbsolute, join, resolve, sep } from 'node:path';

export type DiscoveryDiagnosticCode =
  | 'DIRECTORY_UNREADABLE' | 'FILE_UNREADABLE' | 'FILE_CHANGED'
  | 'SYMLINK_SKIPPED' | 'UNSUPPORTED_INPUT' | 'FILE_TOO_LARGE'
  | 'DEPTH_LIMIT' | 'DIRECTORY_LIMIT' | 'ENTRY_LIMIT'
  | 'FILE_LIMIT' | 'TOTAL_BYTES_LIMIT' | 'PATH_TOO_LONG'
  | 'UNSAFE_PATH' | 'PATH_OUTSIDE_ROOT' | 'NO_SUPPORTED_FILES';

export interface DiscoveryDiagnostic {
  code: DiscoveryDiagnosticCode;
  file: string | null; // POSIX relative only; sanitized and bounded
  message: string; // stable constant, no filesystem errors or source content
}
export interface SourceFile { path: string; sizeBytes: number }
export interface DiscoveryResult {
  root: '.';
  status: 'complete' | 'incomplete';
  files: SourceFile[];
  diagnostics: DiscoveryDiagnostic[];
  stats: { directoriesVisited: number; entriesVisited: number; filesIncluded: number; totalBytes: number };
}
export interface DiscoveryLimits {
  maxDepth: number;
  maxDirectories: number;
  maxEntries: number;
  maxFiles: number;
  maxFileBytes: number;
  maxTotalBytes: number;
  maxPathLength: number;
}
export type DiscoveryIO = {
  opendir: typeof opendir;
  lstat: typeof lstat;
  realpath: typeof realpath;
  open: typeof open;
};
export interface DiscoveryOptions {
  limits?: Partial<DiscoveryLimits>;
  /** Root-relative literal paths (not glob patterns), slash-separated. */
  excludePaths?: string[];
  /** Narrow testing seam; never import files from the repository being scanned. */
  io?: Partial<DiscoveryIO>;
}
export class DiscoveryInputError extends Error {
  readonly code: 'INVALID_CONFIG' | 'INVALID_ROOT';
  constructor(code: 'INVALID_CONFIG' | 'INVALID_ROOT') {
    super(code === 'INVALID_CONFIG' ? 'Invalid discovery configuration' : 'Scan root must be a readable real directory (not a symlink)');
    this.name = 'DiscoveryInputError';
    this.code = code;
  }
}

export const DEFAULT_LIMITS: Readonly<DiscoveryLimits> = Object.freeze({
  maxDepth: 32, maxDirectories: 20_000, maxEntries: 100_000,
  maxFiles: 20_000, maxFileBytes: 1024 * 1024,
  maxTotalBytes: 64 * 1024 * 1024, maxPathLength: 1024,
});
const SKIP_DIRS = new Set([
  '.git', '.hg', '.svn', 'node_modules', 'vendor', 'dist', 'build', 'out',
  'coverage', '.next', '.nuxt', '.turbo', '.cache', 'target', '.venv',
]);
const SUPPORTED = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts']);
const DECLARATION_FILE = /\.d\.(?:ts|mts|cts)$/i;
const MESSAGES: Record<DiscoveryDiagnosticCode, string> = {
  DIRECTORY_UNREADABLE: 'Directory cannot be read; coverage is incomplete.',
  FILE_UNREADABLE: 'Source file cannot be opened for reading.',
  FILE_CHANGED: 'Source file changed type during inspection.',
  SYMLINK_SKIPPED: 'Symbolic link was skipped without following its target.',
  UNSUPPORTED_INPUT: 'An unsupported filesystem entry was skipped.',
  FILE_TOO_LARGE: 'Source file exceeds the configured per-file byte limit.',
  DEPTH_LIMIT: 'Directory exceeds the configured depth limit.',
  DIRECTORY_LIMIT: 'Directory count exceeded the configured limit.',
  ENTRY_LIMIT: 'Directory entry count exceeded the configured limit.',
  FILE_LIMIT: 'Source file count exceeded the configured limit.',
  TOTAL_BYTES_LIMIT: 'Combined source byte limit would be exceeded.',
  PATH_TOO_LONG: 'A path exceeds the configured safe output length.',
  UNSAFE_PATH: 'An entry has an unsafe or ambiguous filename.',
  PATH_OUTSIDE_ROOT: 'A resolved path would leave the scan root.',
  NO_SUPPORTED_FILES: 'No supported JavaScript or TypeScript source files were found.',
};
const ordinal = (a: string, b: string): number => a < b ? -1 : a > b ? 1 : 0;
const inRoot = (root: string, path: string): boolean => {
  const a = process.platform === 'win32' ? root.toLowerCase() : root;
  const b = process.platform === 'win32' ? path.toLowerCase() : path;
  return b === a || b.startsWith(a.endsWith(sep) ? a : a + sep);
};
const unsafeName = (s: string): boolean =>
  s === '.' || s === '..' || s.includes('\\') || /[\x00-\x1f\x7f]/.test(s);

function validateOptions(options: DiscoveryOptions): { limits: DiscoveryLimits; exclusions: string[]; io: DiscoveryIO } {
  const limits: DiscoveryLimits = { ...DEFAULT_LIMITS, ...options.limits };
  for (const key of Object.keys(limits) as (keyof DiscoveryLimits)[]) {
    const value = limits[key];
    if (!Number.isSafeInteger(value) || value < (key === 'maxDepth' ? 0 : 1)) throw new DiscoveryInputError('INVALID_CONFIG');
  }
  if (options.limits && Object.keys(options.limits).some(k => !(k in DEFAULT_LIMITS))) throw new DiscoveryInputError('INVALID_CONFIG');
  if (!Array.isArray(options.excludePaths ?? [])) throw new DiscoveryInputError('INVALID_CONFIG');
  const exclusions: string[] = [];
  for (const entry of options.excludePaths ?? []) {
    if (typeof entry !== 'string' || !entry || isAbsolute(entry) || /(^|\/)\.{1,2}(\/|$)/.test(entry) ||
      entry.includes('\\') || entry.includes('//') || /[\x00-\x1f\x7f]/.test(entry) || entry.startsWith('/') || entry.endsWith('/')) {
      throw new DiscoveryInputError('INVALID_CONFIG');
    }
    exclusions.push(entry);
  }
  return { limits, exclusions, io: { opendir, lstat, realpath, open, ...options.io } };
}

/**
 * Deterministic result for stable filesystem contents, independent of readdir
 * iteration order. Not an atomic snapshot: later parsers must safely recheck
 * each source file before reading it.
 */
export async function discoverSourceFiles(rootPath: string, options: DiscoveryOptions = {}): Promise<DiscoveryResult> {
  if (typeof rootPath !== 'string' || !rootPath.trim() || rootPath.includes('\0')) throw new DiscoveryInputError('INVALID_ROOT');
  const { limits, exclusions, io } = validateOptions(options);
  const rootPathAbs = resolve(rootPath);
  let root: string;
  try {
    const s = await io.lstat(rootPathAbs);
    if (!s.isDirectory() || s.isSymbolicLink()) throw new DiscoveryInputError('INVALID_ROOT');
    root = await io.realpath(rootPathAbs);
  } catch {
    throw new DiscoveryInputError('INVALID_ROOT');
  }
  const stats = { directoriesVisited: 0, entriesVisited: 0, filesIncluded: 0, totalBytes: 0 };
  const files: SourceFile[] = [];
  const diagnostics: DiscoveryDiagnostic[] = [];
  let incomplete = false;
  let stop = false;
  const record = (code: DiscoveryDiagnosticCode, file: string | null) => {
    incomplete = true;
    diagnostics.push({ code, file, message: MESSAGES[code] });
  };
  const excluded = (path: string): boolean => exclusions.some(rule => path === rule || path.startsWith(rule + '/'));
  const stack: { absolute: string; relative: string; depth: number }[] = [{ absolute: root, relative: '', depth: 0 }];
  while (stack.length > 0 && !stop) {
    const dir = stack.pop()!;
    if (stats.directoriesVisited >= limits.maxDirectories) { record('DIRECTORY_LIMIT', dir.relative || null); break; }
    let entries: Dirent[] = [];
    try {
      const realDir = await io.realpath(dir.absolute);
      const lst = await io.lstat(dir.absolute);
      if (!inRoot(root, realDir)) { record('PATH_OUTSIDE_ROOT', dir.relative || null); continue; }
      if (!lst.isDirectory() || lst.isSymbolicLink()) { record('FILE_CHANGED', dir.relative || null); continue; }
      stats.directoriesVisited++;
      const stream = await io.opendir(dir.absolute);
      for await (const entry of stream) {
        if (stats.entriesVisited >= limits.maxEntries) { record('ENTRY_LIMIT', dir.relative || null); stop = true; break; }
        stats.entriesVisited++;
        entries.push(entry);
      }
    } catch { record('DIRECTORY_UNREADABLE', dir.relative || null); continue; }
    // Sort by UTF-16 code units, independent of locale or directory iteration order.
    entries.sort((a, b) => ordinal(a.name, b.name));
    const children: typeof stack = [];
    for (const entry of entries) {
      if (stop) break;
      if (unsafeName(entry.name)) { record('UNSAFE_PATH', null); continue; }
      const rel = dir.relative ? `${dir.relative}/${entry.name}` : entry.name;
      if (excluded(rel) || SKIP_DIRS.has(entry.name)) continue;
      if (rel.length > limits.maxPathLength) { record('PATH_TOO_LONG', null); continue; }
      const absolute = join(dir.absolute, entry.name);
      let lst: Awaited<ReturnType<typeof io.lstat>>;
      try { lst = await io.lstat(absolute); }
      catch { record('FILE_UNREADABLE', rel); continue; }
      if (lst.isSymbolicLink()) { record('SYMLINK_SKIPPED', rel); continue; }
      if (lst.isDirectory()) {
        if (dir.depth >= limits.maxDepth) { record('DEPTH_LIMIT', rel); continue; }
        children.push({ absolute, relative: rel, depth: dir.depth + 1 });
        continue;
      }
      if (!lst.isFile()) { record('UNSUPPORTED_INPUT', rel); continue; }
      const ext = extname(entry.name).toLowerCase();
      if (!SUPPORTED.has(ext) || DECLARATION_FILE.test(entry.name)) continue;
      if (stats.filesIncluded >= limits.maxFiles) { record('FILE_LIMIT', rel); stop = true; break; }
      try {
        // Always check canonical containment. O_NOFOLLOW protects the final
        // component on platforms that support it; never read source content.
        const canonical = await io.realpath(absolute);
        if (!inRoot(root, canonical)) { record('PATH_OUTSIDE_ROOT', rel); continue; }
        const flags = constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0);
        const handle = await io.open(absolute, flags);
        let size: number;
        try {
          const st = await handle.stat();
          if (!st.isFile()) { record('FILE_CHANGED', rel); continue; }
          size = st.size;
        } finally { await handle.close(); }
        if (size > limits.maxFileBytes) { record('FILE_TOO_LARGE', rel); continue; }
        if (size > limits.maxTotalBytes - stats.totalBytes) { record('TOTAL_BYTES_LIMIT', rel); stop = true; break; }
        files.push({ path: rel, sizeBytes: size });
        stats.filesIncluded++;
        stats.totalBytes += size;
      } catch { record('FILE_UNREADABLE', rel); }
    }
    // Children must be pushed in reverse sorted order for stable DFS traversal.
    for (let i = children.length - 1; i >= 0; i--) stack.push(children[i]!);
  }
  if (!files.length) record('NO_SUPPORTED_FILES', null);
  files.sort((a, b) => ordinal(a.path, b.path));
  diagnostics.sort((a, b) => ordinal(a.file ?? '', b.file ?? '') || ordinal(a.code, b.code));
  return { root: '.', status: incomplete ? 'incomplete' : 'complete', files, diagnostics, stats };
}
