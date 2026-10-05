import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import type { ProfileConfig } from '../types.ts';
import { validateConfig } from './schema.ts';

export const CONFIG_FILE = 'profile.config.yml';

export function loadConfig(root: string): ProfileConfig {
  const file = path.join(root, CONFIG_FILE);
  if (!fs.existsSync(file)) throw new Error(`${CONFIG_FILE} not found in ${root}`);
  const raw: unknown = parse(fs.readFileSync(file, 'utf8'));
  return validateConfig(raw);
}
