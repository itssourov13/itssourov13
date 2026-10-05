import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GithubApi } from './api/github.ts';
import { loadConfig } from './config/load.ts';
import { ConfigError } from './config/schema.ts';
import { collectFromGithub } from './data/collect.ts';
import { loadCollected, saveCollected } from './data/store.ts';
import { buildOutputs, currentMedia, diffOutputs, writeOutputs } from './pipeline.ts';
import { checkJson, checkLinks, checkSecrets } from './validation/checks.ts';
import { fixtureData } from '../fixtures/index.ts';
import { log } from './util/log.ts';
import type { MediaState } from './data/media.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function parseArgs(argv: string[]) {
  const flags = new Set(argv.filter((a) => a.startsWith('--')));
  return { cmd: argv.find((a) => !a.startsWith('--')) ?? 'help', has: (f: string) => flags.has(f) };
}

async function collect(allowStale: boolean): Promise<void> {
  const config = loadConfig(ROOT);
  const dataDir = path.join(ROOT, 'data');
  let previous = null;
  try {
    previous = loadCollected(dataDir);
  } catch (err) {
    log.warn(`Existing data is unreadable and will not be reused: ${(err as Error).message}`);
  }
  const token = process.env.GITHUB_TOKEN || undefined;
  log.info(`Collecting data for ${config.profile.username} (${token ? 'authenticated' : 'unauthenticated'})`);
  try {
    const next = await collectFromGithub(config, new GithubApi({ token }), previous?.contributions ?? null);
    const { changed } = saveCollected(dataDir, next);
    log.info(changed ? 'Data updated.' : 'No data changes.');
  } catch (err) {
    if (allowStale && previous) {
      log.warn(`Collection failed (${(err as Error).message}); keeping last known good data.`);
      return;
    }
    throw err;
  }
}

function generate(fixture: boolean): void {
  const loaded = loadConfig(ROOT);
  // Fixture previews use synthetic repositories, so feature those instead of the real configured names.
  const config = fixture ? { ...loaded, featured_repositories: ['fixture-scanner', 'fixture-os'] } : loaded;
  const outRoot = fixture ? path.join(ROOT, '.preview') : ROOT;
  const data = fixture ? fixtureData() : loadCollected(path.join(ROOT, 'data'));
  const media: MediaState = fixture ? { warnings: [] } : currentMedia(ROOT, config);
  const { files, warnings } = buildOutputs(config, data, media);
  for (const w of warnings) log.warn(w);
  writeOutputs(outRoot, files);
  log.info(`${data ? 'Generated' : 'Generated (no collected data yet)'} ${files.length} files in ${fixture ? '.preview/' : 'repository'}.`);
}

function report(name: string, problems: string[]): void {
  if (problems.length === 0) return void log.info(`${name}: OK`);
  for (const p of problems) log.error(`${name}: ${p}`);
  process.exitCode = 1;
}

async function main(): Promise<void> {
  const { cmd, has } = parseArgs(process.argv.slice(2));
  switch (cmd) {
    case 'validate-config':
      loadConfig(ROOT);
      log.info('profile.config.yml: OK');
      break;
    case 'collect':
      await collect(has('--allow-stale'));
      break;
    case 'generate':
      generate(has('--fixture'));
      break;
    case 'update':
      await collect(true);
      generate(false);
      break;
    case 'check-generated': {
      const config = loadConfig(ROOT);
      const { files } = buildOutputs(config, loadCollected(path.join(ROOT, 'data')), currentMedia(ROOT, config));
      report('check-generated', [...diffOutputs(ROOT, files), ...checkJson(ROOT)]);
      break;
    }
    case 'check-links':
      report('check-links', checkLinks(ROOT));
      break;
    case 'check-secrets':
      report('check-secrets', checkSecrets(ROOT));
      break;
    default:
      console.log('Usage: tsx scripts/src/index.ts <collect|generate|update|validate-config|check-generated|check-links|check-secrets> [--allow-stale] [--fixture]');
      if (cmd !== 'help') process.exitCode = 1;
  }
}

main().catch((err) => {
  if (err instanceof ConfigError) log.error(err.message);
  else log.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
