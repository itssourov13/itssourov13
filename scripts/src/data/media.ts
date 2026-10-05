import fs from 'node:fs';
import type { ProfileConfig } from '../types.ts';
import { resolveWithin, toPosix } from '../util/fs.ts';
import path from 'node:path';

export interface MediaItem {
  path: string; // repo-relative POSIX
  bytes: number;
  width?: number;
  height?: number;
}
export interface MediaState {
  profileImage?: MediaItem;
  heroGif?: MediaItem;
  introVideo?: MediaItem;
  warnings: string[];
}

const MB = 1024 * 1024;

function head(file: string, n = 64 * 1024): Buffer {
  const fd = fs.openSync(file, 'r');
  try {
    const buf = Buffer.alloc(n);
    const read = fs.readSync(fd, buf, 0, n, 0);
    return buf.subarray(0, read);
  } finally {
    fs.closeSync(fd);
  }
}

type Kind = 'png' | 'jpeg' | 'webp' | 'gif' | 'mp4' | null;
export function sniff(b: Buffer): Kind {
  if (b.length >= 8 && b.readUInt32BE(0) === 0x89504e47) return 'png';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (b.length >= 6 && b.toString('ascii', 0, 4) === 'GIF8') return 'gif';
  if (b.length >= 12 && b.toString('ascii', 4, 8) === 'ftyp') return 'mp4';
  return null;
}

export function dimensions(b: Buffer, kind: Kind): { width: number; height: number } | undefined {
  if (kind === 'png' && b.length >= 24) return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  if (kind === 'gif' && b.length >= 10) return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
  if (kind === 'jpeg') {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return undefined;
      const marker = b[i + 1]!;
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
      }
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return undefined;
}

function inspectOne(root: string, rel: string, allowed: Kind[], maxBytes: number, label: string, warnings: string[]): MediaItem | undefined {
  if (!rel) return undefined;
  let full: string;
  try {
    full = resolveWithin(root, rel);
  } catch {
    warnings.push(`${label}: path "${rel}" is outside the repository; ignored.`);
    return undefined;
  }
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return undefined; // absent = normal, fallback applies
  const bytes = fs.statSync(full).size;
  if (bytes > maxBytes) {
    warnings.push(`${label}: ${rel} is ${(bytes / MB).toFixed(1)} MB (limit ${(maxBytes / MB).toFixed(0)} MB); ignored. See docs/MEDIA.md.`);
    return undefined;
  }
  const buf = head(full);
  const kind = sniff(buf);
  if (!kind || !allowed.includes(kind)) {
    warnings.push(`${label}: ${rel} is not a supported format (${allowed.join('/')}); ignored.`);
    return undefined;
  }
  const dim = dimensions(buf, kind);
  if (dim && (dim.width < 64 || dim.height < 64 || dim.width > 8000 || dim.height > 8000)) {
    warnings.push(`${label}: ${rel} has unsupported dimensions ${dim.width}x${dim.height}; ignored.`);
    return undefined;
  }
  return { path: toPosix(path.normalize(rel)), bytes, ...dim };
}

export function inspectMedia(root: string, media: ProfileConfig['media']): MediaState {
  const warnings: string[] = [];
  const profileImage = inspectOne(root, media.profile_image, ['png', 'jpeg', 'webp'], 5 * MB, 'profile image', warnings);
  const heroGif = inspectOne(root, media.hero_animation, ['gif'], 10 * MB, 'hero animation', warnings);
  const introVideo = inspectOne(root, media.intro_video, ['mp4'], 50 * MB, 'intro video', warnings);
  if (profileImage && profileImage.bytes > MB) warnings.push(`profile image is ${(profileImage.bytes / MB).toFixed(1)} MB; consider optimizing (docs/MEDIA.md).`);
  return { profileImage, heroGif, introVideo, warnings };
}
