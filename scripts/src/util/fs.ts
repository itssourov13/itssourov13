import fs from 'node:fs';
import path from 'node:path';

/** Resolve `rel` inside `root`; throws if the result escapes root (path traversal guard). */
export function resolveWithin(root: string, rel: string): string {
  const base = path.resolve(root);
  const full = path.resolve(base, rel);
  if (full !== base && !full.startsWith(base + path.sep)) {
    throw new Error(`Path escapes project root: ${rel}`);
  }
  return full;
}

export function writeFileEnsured(file: string, content: string | Buffer): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

export function walkFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full));
    else if (entry.isFile()) out.push(full);
  }
  return out.sort();
}

export function toPosix(p: string): string {
  return p.split(path.sep).join('/');
}
