# Media

Put your own files under `assets/source/` (paths come from `media:` in `profile.config.yml`):

| File            | Formats           | Limits                        | Used for                                                                                         |
| --------------- | ----------------- | ----------------------------- | ------------------------------------------------------------------------------------------------ |
| `profile.png`   | PNG / JPEG / WebP | ≤ 5 MB, 64–8000 px            | Portrait next to the intro; also shown on the 3D media wall                                      |
| `intro.gif`     | GIF               | ≤ 10 MB                       | Optional motion block under the hero (links to `intro_video_url` if set)                         |
| `cinematic.jpg` | PNG / JPEG / WebP | ≤ 6 MB (≤ 1.5 MB recommended) | Your own photo for the **After hours** section; replaces the generated illustration              |
| `intro.mp4`     | MP4               | ≤ 50 MB                       | Presence is detected; GitHub READMEs cannot play it inline, so host it and set `intro_video_url` |

- Files are validated by **content** (magic bytes), not extension. Invalid or oversized files are ignored with a warning; the README never links a missing file.
- Missing media is normal: the hero is typographic and works as the designed fallback. No portrait or video is ever generated or invented.
- **Optimizing** (not automated, to avoid heavy dependencies and non-deterministic output):
  `ffmpeg -i raw.png -vf scale=640:-1 assets/source/profile.png` · poster frame: `ffmpeg -ss 2 -i intro.mp4 -frames:v 1 -vf scale=1280:-1 poster.png`.
- Prefer small files; every clone downloads them.

## Loading and failure behaviour in the 3D world

The portrait texture is **not** requested at startup: it loads when the browser is idle or when the visitor opens the Portrait stop, and is disposed when unmounted. If the file is missing, blocked or undecodable, the frame stays empty and the rest of the world is unaffected. The Portrait camera stop is only offered when `generated-profile.json` declares a valid portrait. Nothing is generated or substituted for personal imagery.

## The cinematic "After hours" frame

The README ships with an **original, generated night-city illustration** (`assets/generated/cinematic-night-city.svg`) so the section looks finished from day one. It is a stand-in, not a photo of you, and it is clearly tagged _Illustrated frame_.

To use your own photo:

1. Save it as `assets/source/cinematic.jpg` (or point `media.cinematic_image` at another path; PNG/JPEG/WebP). A **wide crop, about 21:9** (for example 2400×1000), keeps the composition intact; a warning is printed when the ratio is far from that.
2. Optionally set `cinematic.title`, `cinematic.caption` and, importantly, `cinematic.alt` (a description for screen readers) in `profile.config.yml`.
3. Run `npm run generate`. The README now uses your photo, the caption strip switches its tag to _Photograph_, and the generated illustration is removed. Nothing else in the layout changes.

Only use images you own or have the right to publish (no game screenshots or stock images you do not hold rights to). Set `cinematic.enabled: false` to drop the section.

Optimizing: `ffmpeg -i raw.jpg -vf "scale=2400:-1,crop=2400:1000" -q:v 4 assets/source/cinematic.jpg`.
