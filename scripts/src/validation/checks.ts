import fs from 'node:fs';
import path from 'node:path';
import { toPosix, walkFiles } from '../util/fs.ts';

/** Local (repo-relative) references found in README markup. */
export function findLocalRefs(markdown: string): string[] {
  const refs = new Set<string>();
  const patterns = [/(?:src|srcset|href)="([^"]+)"/g, /\]\(([^)\s]+)\)/g];
  for (const re of patterns) {
    for (const m of markdown.matchAll(re)) {
      const raw = (m[1] ?? '').trim().split(/\s+/)[0] ?? '';
      if (!raw || /^(https?:|mailto:|#|data:)/i.test(raw)) continue;
      refs.add(decodeURI(raw.split('#')[0]!.split('?')[0]!));
    }
  }
  return [...refs].sort();
}

export function checkLinks(root: string, readmeRel = 'README.md'): string[] {
  const readme = path.join(root, readmeRel);
  if (!fs.existsSync(readme)) return [`${readmeRel} does not exist`];
  const problems: string[] = [];
  for (const ref of findLocalRefs(fs.readFileSync(readme, 'utf8'))) {
    const abs = path.resolve(root, ref);
    if (!abs.startsWith(path.resolve(root) + path.sep) || !fs.existsSync(abs)) problems.push(`broken local reference: ${ref}`);
  }
  return problems;
}

const SECRET_PATTERNS: [string, RegExp][] = [
  ['GitHub token', /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b/],
  ['GitHub fine-grained token', /\bgithub_pat_[A-Za-z0-9_]{40,}\b/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['private key block', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['bearer credential', /\bBearer\s+[A-Za-z0-9._-]{20,}/],
  ['Slack token', /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/],
];

export function scanForSecrets(text: string): string[] {
  return SECRET_PATTERNS.filter(([, re]) => re.test(text)).map(([name]) => name);
}

export function checkSecrets(root: string): string[] {
  const targets = [path.join(root, 'README.md'), ...walkFiles(path.join(root, 'assets/generated')), ...walkFiles(path.join(root, 'data'))];
  const problems: string[] = [];
  for (const file of targets) {
    if (!fs.existsSync(file)) continue;
    for (const hit of scanForSecrets(fs.readFileSync(file, 'utf8'))) problems.push(`${hit} pattern in ${toPosix(path.relative(root, file))}`);
  }
  return problems;
}

export function checkJson(root: string): string[] {
  const problems: string[] = [];
  for (const file of walkFiles(path.join(root, 'data')).filter((f) => f.endsWith('.json'))) {
    try {
      JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {
      problems.push(`invalid JSON: ${toPosix(path.relative(root, file))}`);
    }
  }
  return problems;
}
