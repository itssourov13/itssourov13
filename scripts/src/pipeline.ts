import fs from 'node:fs';
import path from 'node:path';
import type { CollectedData, OutputFile, ProfileConfig } from './types.ts';
import { inspectMedia } from './data/media.ts';
import type { MediaState } from './data/media.ts';
import {
  buildEdges,
  computeStats,
  graphProjects,
  languageTotals,
  selectLatest,
} from './data/normalize.ts';
import { buildWorldData } from './data/worldData.ts';
import { renderCard } from './generators/cards.ts';
import { renderCinematicCaption, renderCinematicScene } from './generators/cinematic.ts';
import { renderConstellation } from './generators/constellation.ts';
import { renderHero } from './generators/hero.ts';
import { renderIntelligence } from './generators/intelligence.ts';
import { renderLanguages } from './generators/languages.ts';
import { renderPulse } from './generators/pulse.ts';
import { renderTerminal } from './generators/terminal.ts';
import { renderTerrain } from './generators/terrain.ts';
import { renderCta, renderFooter } from './generators/world.ts';
import { GEN, cinematicState, featuredTargets, renderReadme } from './renderers/readme.ts';
import { stableStringify } from './util/json.ts';
import { walkFiles, toPosix, writeFileEnsured } from './util/fs.ts';

export interface BuildResult {
  files: OutputFile[];
  warnings: string[];
}

/** Pure, deterministic: same config + data + media state → identical files. */
export function buildOutputs(
  config: ProfileConfig,
  data: CollectedData | null,
  media: MediaState,
): BuildResult {
  const warnings = [...media.warnings];
  const files: OutputFile[] = [];
  const add = (p: string, content: string) => files.push({ path: p, content });

  const { targets, missing } = featuredTargets(config, data);
  for (const m of missing)
    warnings.push(
      `Featured repository "${m}" not found among public repositories of ${config.profile.username}; skipped.`,
    );
  const latest = data
    ? selectLatest(data.repos, config.project_rules, config.profile.username)
    : [];
  const cal = data?.contributions ?? null;

  const featuredProjects = targets.map((t) => t.project).filter((p) => p !== null);
  const graph = data ? graphProjects(featuredProjects, latest) : [];

  add('README.md', renderReadme(config, data, media));
  add(`${GEN}/hero-dark.svg`, renderHero(config, 'dark'));
  add(`${GEN}/hero-light.svg`, renderHero(config, 'light'));
  add(
    `${GEN}/terminal.svg`,
    renderTerminal(
      config,
      latest.map((p) => p.name),
    ),
  );
  add(
    `${GEN}/enter-world.svg`,
    renderCta(
      config.world.title,
      data
        ? { count: graph.length, edges: buildEdges(graph).map((e): [number, number] => [e.a, e.b]) }
        : undefined,
    ),
  );
  add(`${GEN}/footer.svg`, renderFooter(config));
  const cine = cinematicState(config, media);
  if (cine.enabled) {
    // The generated frame is only a stand-in: it is not produced (and stale copies are removed) once a real photo exists.
    if (cine.kind === 'illustration')
      add(`${GEN}/cinematic-night-city.svg`, renderCinematicScene());
    add(
      `${GEN}/cinematic-caption.svg`,
      renderCinematicCaption(config.cinematic.title, config.cinematic.caption, cine.kind),
    );
  }
  targets.forEach((t, i) =>
    add(
      `${GEN}/cards/${t.name}.svg`,
      renderCard(t.name, t.project, data?.collectedAt ?? '1970-01-01T00:00:00Z', i + 1),
    ),
  );
  if (data) {
    add(
      `${GEN}/project-constellation.svg`,
      renderConstellation(
        graph,
        targets.map((t) => t.name),
        data.collectedAt,
      ),
    );
    add(`${GEN}/contribution-terrain.svg`, renderTerrain(cal));
    add(
      `${GEN}/github-intelligence.svg`,
      renderIntelligence(
        computeStats(data.user, data.repos, cal, data.collectedAt),
        data.collectedAt,
        data.fixture === true,
      ),
    );
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
