import fs from 'node:fs';
import path from 'node:path';
import type { CollectedData, OutputFile, ProfileConfig } from './types.ts';
import { inspectMedia } from './data/media.ts';
import type { MediaState } from './data/media.ts';
import { computeStats, graphProjects, languageTotals, selectLatest } from './data/normalize.ts';
import { buildWorldData } from './data/worldData.ts';
import { renderCard } from './generators/cards.ts';
import { renderHero } from './generators/hero.ts';
import { renderConstellation, renderCta, renderIntelligence, renderLanguages, renderPulse, renderTerminal } from './generators/panels.ts';
import { renderTerrain } from './generators/terrain.ts';
import { GEN, featuredTargets, renderReadme } from './renderers/readme.ts';
import { stableStringify } from './util/json.ts';
import { walkFiles, toPosix, writeFileEnsured } from './util/fs.ts';

export interface BuildResult {
  files: OutputFile[];
  warnings: string[];
}

/** Pure, deterministic: same config + data + media state → identical files. */
export function buildOutputs(config: ProfileConfig, data: CollectedData | null, media: MediaState): BuildResult {
  const warnings = [...media.warnings];
  const files: OutputFile[] = [];
  const add = (p: string, content: string) => files.push({ path: p, content });

  const { targets, missing } = featuredTargets(config, data);
  for (const m of missing) warnings.push(`Featured repository "${m}" not found among public repositories of ${config.profile.username}; skipped.`);
  const latest = data ? selectLatest(data.repos, config.project_rules, config.profile.username) : [];
  const cal = data?.contributions ?? null;

  add('README.md', renderReadme(config, data, media));
  add(`${GEN}/hero-dark.svg`, renderHero(config, 'dark'));
  add(`${GEN}/hero-light.svg`, renderHero(config, 'light'));
  add(`${GEN}/terminal.svg`, renderTerminal(config));
  add(`${GEN}/enter-world.svg`, renderCta(config.world.title));
  for (const t of targets) add(`${GEN}/cards/${t.name}.svg`, renderCard(t.name, t.project));
  if (data) {
    const graph = graphProjects(targets.map((t) => t.project).filter((p) => p !== null), latest);
    add(`${GEN}/project-constellation.svg`, renderConstellation(graph));
    add(`${GEN}/contribution-terrain.svg`, renderTerrain(cal));
    add(`${GEN}/github-intelligence.svg`, renderIntelligence(computeStats(data.user, data.repos, cal, data.collectedAt), data.collectedAt, data.fixture === true));
    add(`${GEN}/language-galaxy.svg`, renderLanguages(languageTotals(data.repos)));
    add(`${GEN}/activity-pulse.svg`, renderPulse(cal));
  }
  add('data/generated-profile.json', stableStringify(buildWorldData(config, data, media)));
  return { files, warnings };
}

export function currentMedia(root: string, config: ProfileConfig): MediaState {
  return inspectMedia(root, config.media);
}

/** Write outputs and remove stale generated SVGs (only inside assets/generated). */
export function writeOutputs(outRoot: string, files: OutputFile[]): void {
  for (const f of files) writeFileEnsured(path.join(outRoot, f.path), f.content);
  const genDir = path.join(outRoot, GEN);
  const keep = new Set(files.map((f) => f.path));
  for (const abs of walkFiles(genDir)) {
    const rel = toPosix(path.relative(outRoot, abs));
    if (rel.endsWith('.svg') && !keep.has(rel)) fs.rmSync(abs);
  }
}

/** Compare would-be outputs with what is on disk. Returns human-readable problems (empty = in sync). */
export function diffOutputs(root: string, files: OutputFile[]): string[] {
  const problems: string[] = [];
  for (const f of files) {
    const abs = path.join(root, f.path);
    if (!fs.existsSync(abs)) problems.push(`missing: ${f.path}`);
    else if (fs.readFileSync(abs, 'utf8') !== f.content) problems.push(`out of date: ${f.path}`);
  }
  const keep = new Set(files.map((f) => f.path));
  for (const abs of walkFiles(path.join(root, GEN))) {
    const rel = toPosix(path.relative(root, abs));
    if (rel.endsWith('.svg') && !keep.has(rel)) problems.push(`stale: ${rel}`);
  }
  return problems;
}
