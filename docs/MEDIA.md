# Media

Put your own files under `assets/source/` (paths come from `media:` in `profile.config.yml`):

| File | Formats | Limits | Used for |
| --- | --- | --- | --- |
| `profile.png` | PNG / JPEG / WebP | ≤ 5 MB, 64–8000 px | Portrait next to the intro; also shown on the 3D media wall |
| `intro.gif` | GIF | ≤ 10 MB | Optional motion block under the hero (links to `intro_video_url` if set) |
| `intro.mp4` | MP4 | ≤ 50 MB | Presence is detected; GitHub READMEs cannot play it inline, so host it and set `intro_video_url` |

- Files are validated by **content** (magic bytes), not extension. Invalid or oversized files are ignored with a warning; the README never links a missing file.
- Missing media is normal: the hero is typographic and works as the designed fallback. No portrait or video is ever generated or invented.
- **Optimizing** (not automated, to avoid heavy dependencies and non-deterministic output):
  `ffmpeg -i raw.png -vf scale=640:-1 assets/source/profile.png` · poster frame: `ffmpeg -ss 2 -i intro.mp4 -frames:v 1 -vf scale=1280:-1 poster.png`.
- Prefer small files; every clone downloads them.

## Loading and failure behaviour in the 3D world

The portrait texture is **not** requested at startup: it loads when the browser is idle or when the visitor opens the Portrait stop, and is disposed when unmounted. If the file is missing, blocked or undecodable, the frame stays empty and the rest of the world is unaffected. The Portrait camera stop is only offered when `generated-profile.json` declares a valid portrait. Nothing is generated or substituted for personal imagery.
