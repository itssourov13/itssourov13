import fs from 'node:fs';
import path from 'node:path';
import { SCHEMA_VERSION } from '../constants.ts';
import type { CollectedData, ContributionCalendar, GithubUser, ProjectRecord } from '../types.ts';
import { stableStringify } from '../util/json.ts';
import { writeFileEnsured } from '../util/fs.ts';

export const FILES = {
  snapshot: 'github.snapshot.json',
  repos: 'repositories.json',
  contributions: 'github.contributions.json',
} as const;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function validateProject(v: unknown, i: number): ProjectRecord {
  if (!isObj(v)) throw new Error(`repositories[${i}] is not an object`);
  for (const k of ['name', 'fullName', 'url', 'description', 'createdAt', 'updatedAt', 'pushedAt', 'visibility', 'defaultBranch']) {
    if (!isStr(v[k])) throw new Error(`repositories[${i}].${k} is not a string`);
  }
  if (!isNum(v.stars) || !isNum(v.forks)) throw new Error(`repositories[${i}] stars/forks invalid`);
  if (typeof v.archived !== 'boolean' || typeof v.fork !== 'boolean') throw new Error(`repositories[${i}] flags invalid`);
  if (!Array.isArray(v.topics) || !v.topics.every(isStr)) throw new Error(`repositories[${i}].topics invalid`);
  if (!String(v.url).startsWith('https://github.com/')) throw new Error(`repositories[${i}].url invalid`);
  return v as unknown as ProjectRecord;
}

function validateUser(v: unknown): GithubUser {
  if (!isObj(v) || !isStr(v.login) || !isStr(v.htmlUrl) || !isNum(v.publicRepos) || !isNum(v.followers)) {
    throw new Error('snapshot.user is invalid');
  }
  return v as unknown as GithubUser;
}

function validateCalendar(v: unknown): ContributionCalendar {
  if (!isObj(v) || !isNum(v.total) || !Array.isArray(v.weeks)) throw new Error('contributions.calendar is invalid');
  for (const w of v.weeks) {
    if (!Array.isArray(w)) throw new Error('contributions week is invalid');
    for (const d of w) if (!isObj(d) || !isStr(d.date) || !isNum(d.count) || !isNum(d.level)) throw new Error('contributions day is invalid');
  }
  return v as unknown as ContributionCalendar;
}

function readJson(file: string): unknown {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** Load collected data. Returns null when no snapshot exists yet; throws when files are corrupt (fail closed). */
export function loadCollected(dataDir: string): CollectedData | null {
  const snapFile = path.join(dataDir, FILES.snapshot);
  if (!fs.existsSync(snapFile)) return null;
  const snap = readJson(snapFile);
  if (!isObj(snap) || !isStr(snap.collectedAt) || Number.isNaN(Date.parse(snap.collectedAt))) throw new Error(`${FILES.snapshot}: invalid collectedAt`);
  const reposFile = path.join(dataDir, FILES.repos);
  if (!fs.existsSync(reposFile)) throw new Error(`${FILES.repos} is missing`);
  const reposRaw = readJson(reposFile);
  if (!isObj(reposRaw) || !Array.isArray(reposRaw.repos)) throw new Error(`${FILES.repos}: invalid`);
  const contribFile = path.join(dataDir, FILES.contributions);
  let contributions: ContributionCalendar | null = null;
  if (fs.existsSync(contribFile)) {
    const c = readJson(contribFile);
    if (isObj(c) && c.calendar) contributions = validateCalendar(c.calendar);
  }
  return {
    collectedAt: snap.collectedAt,
    fixture: snap.fixture === true ? true : undefined,
    user: validateUser(snap.user),
    repos: reposRaw.repos.map(validateProject),
    contributions,
  };
}

/**
 * Write collected data. If nothing but `collectedAt` changed, files are left untouched so
 * scheduled runs do not create empty-diff commits.
 */
export function saveCollected(dataDir: string, next: CollectedData): { changed: boolean } {
  let prev: CollectedData | null = null;
  try {
    prev = loadCollected(dataDir);
  } catch {
    prev = null;
  }
  const strip = (d: CollectedData) => stableStringify({ ...d, collectedAt: '' });
  if (prev && strip(prev) === strip(next)) return { changed: false };
  writeFileEnsured(path.join(dataDir, FILES.snapshot), stableStringify({ schemaVersion: SCHEMA_VERSION, collectedAt: next.collectedAt, fixture: next.fixture, user: next.user }));
  writeFileEnsured(path.join(dataDir, FILES.repos), stableStringify({ schemaVersion: SCHEMA_VERSION, repos: next.repos }));
  writeFileEnsured(path.join(dataDir, FILES.contributions), stableStringify({ schemaVersion: SCHEMA_VERSION, calendar: next.contributions }));
  return { changed: true };
}
