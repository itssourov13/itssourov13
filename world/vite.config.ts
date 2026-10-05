import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import { resolveBase } from './base.ts';

const worldDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(worldDir, '..');
const DATA_FILE = 'data/generated-profile.json';
const MAX_MEDIA_BYTES = 5 * 1024 * 1024;

/** Serves/emits the generated profile JSON (and the optional profile photo) so the browser never calls the GitHub API. */
function profileAssets(base: string): Plugin {
  const dataPath = path.join(repoRoot, DATA_FILE);
  const mediaSource = (): { file: string; abs: string } | null => {
    try {
      const j = JSON.parse(fs.readFileSync(dataPath, 'utf8')) as { media?: { profileImage?: { file?: string; sourcePath?: string } | null } };
      const img = j.media?.profileImage;
      if (!img?.file || !img.sourcePath || !/^media\/[\w.-]+$/.test(img.file)) return null;
      const abs = path.resolve(repoRoot, img.sourcePath);
      if (!abs.startsWith(repoRoot + path.sep) || !fs.existsSync(abs) || fs.statSync(abs).size > MAX_MEDIA_BYTES) return null;
      return { file: img.file, abs };
    } catch {
      return null;
    }
  };
  return {
    name: 'profile-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? '').split('?')[0];
        if (url === `${base}${DATA_FILE}` && fs.existsSync(dataPath)) {
          res.setHeader('Content-Type', 'application/json');
          res.end(fs.readFileSync(dataPath));
          return;
        }
        const m = mediaSource();
        if (m && url === `${base}${m.file}`) {
          res.end(fs.readFileSync(m.abs));
          return;
        }
        next();
      });
    },
    generateBundle() {
      if (fs.existsSync(dataPath)) this.emitFile({ type: 'asset', fileName: DATA_FILE, source: fs.readFileSync(dataPath) });
      const m = mediaSource();
      if (m) this.emitFile({ type: 'asset', fileName: m.file, source: fs.readFileSync(m.abs) });
    },
  };
}

const base = resolveBase(process.env.WORLD_BASE);

export default defineConfig({
  root: worldDir,
  base,
  plugins: [react(), profileAssets(base)],
  build: { outDir: 'dist', emptyOutDir: true, target: 'es2022', chunkSizeWarningLimit: 1200 },
});
