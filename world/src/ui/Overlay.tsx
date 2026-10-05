import { useState } from 'react';
import type { WorldProfile } from '../data/parse.ts';
import { sceneProjects } from '../data/parse.ts';
import type { QualitySetting } from '../effects/quality.ts';
import { STOPS } from '../scene/stops.ts';

const SOCIAL_LABELS: Record<string, string> = { github: 'GitHub', linkedin: 'LinkedIn', x: 'X', facebook: 'Facebook', instagram: 'Instagram', blog: 'Blog', portfolio: 'Portfolio' };

export interface OverlayProps {
  profile: WorldProfile;
  sceneActive: boolean; // false → 3D unavailable, show the summary full-screen
  notice?: string;
  stopId: string;
  onStop: (id: string) => void;
  quality: QualitySetting;
  onQuality: (q: QualitySetting) => void;
  reduced: boolean;
  onReduced: (v: boolean) => void;
  activeProject: string | null;
  onActive: (n: string | null) => void;
}

/** All meaningful content is real DOM text/links, so it works with keyboards, screen readers and without WebGL. */
export function Overlay(p: OverlayProps) {
  const [open, setOpen] = useState(!p.sceneActive);
  const { profile } = p;
  const projects = sceneProjects(profile);
  const stops = STOPS.filter((s) => s.id !== 'media' || profile.media.profileImage);
  const panelOpen = open || !p.sceneActive;

  return (
    <div className={`hud${p.sceneActive ? '' : ' flat'}`}>
      <header className="brand">
        <p className="eyebrow">{profile.world.title}</p>
        <h1>{profile.profile.displayName}</h1>
        <p className="headline">{profile.profile.headline}</p>
      </header>

      {p.sceneActive && (
        <nav className="tour" aria-label="Camera positions">
          {stops.map((s) => (
            <button key={s.id} type="button" aria-pressed={p.stopId === s.id} onClick={() => p.onStop(s.id)}>
              {s.label}
            </button>
          ))}
        </nav>
      )}

      <aside className={`panel${panelOpen ? ' open' : ''}`} aria-label="Profile details">
        {p.sceneActive && (
          <button type="button" className="panel-toggle" aria-expanded={panelOpen} onClick={() => setOpen(!open)}>
            {panelOpen ? 'Hide details' : 'Show details'}
          </button>
        )}
        {panelOpen && (
          <div className="panel-body">
            {p.notice && <p className="notice" role="status">{p.notice}</p>}
            {profile.status === 'unavailable' && <p className="notice" role="status">GitHub data has not been collected yet. It appears after the first scheduled update.</p>}
            {profile.profile.bio.map((b) => <p key={b}>{b}</p>)}

            {profile.stats && (
              <dl className="stats">
                <div><dt>Public repos</dt><dd>{profile.stats.publicRepos}</dd></div>
                <div><dt>Followers</dt><dd>{profile.stats.followers}</dd></div>
                {profile.stats.totalContributions !== null && <div><dt>Contributions (12 mo)</dt><dd>{profile.stats.totalContributions.toLocaleString('en-US')}</dd></div>}
                <div><dt>Stars</dt><dd>{profile.stats.totalStars}</dd></div>
              </dl>
            )}

            {projects.length > 0 && (
              <section aria-labelledby="h-projects">
                <h2 id="h-projects">Projects</h2>
                <ul className="projects">
                  {projects.map((pr) => (
                    <li key={pr.name} className={p.activeProject === pr.name ? 'on' : ''} onMouseEnter={() => p.onActive(pr.name)} onMouseLeave={() => p.onActive(null)}>
                      <a href={pr.url} target="_blank" rel="noopener noreferrer" onFocus={() => p.onActive(pr.name)} onBlur={() => p.onActive(null)}>{pr.name}</a>
                      <span>{pr.language ?? ''}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {profile.languages && (
              <section aria-labelledby="h-langs">
                <h2 id="h-langs">Languages</h2>
                <p className="langs">{profile.languages.items.map((i) => `${i.name} ${i.percent.toFixed(1)}%`).join(' · ')}</p>
              </section>
            )}

            {profile.profile.focus.length > 0 && (
              <section aria-labelledby="h-focus">
                <h2 id="h-focus">Focus</h2>
                <p className="langs">{profile.profile.focus.join(' · ')}</p>
              </section>
            )}

            <section aria-labelledby="h-links">
              <h2 id="h-links">Links</h2>
              <ul className="links">
                {Object.entries(profile.profile.socials).map(([k, url]) => (
                  <li key={k}><a href={url} target="_blank" rel="noopener noreferrer">{SOCIAL_LABELS[k] ?? k}</a></li>
                ))}
                {profile.media.introVideoUrl && <li><a href={profile.media.introVideoUrl} target="_blank" rel="noopener noreferrer">Intro video</a></li>}
              </ul>
            </section>

            {p.sceneActive && (
              <section aria-labelledby="h-settings" className="settings">
                <h2 id="h-settings">Display</h2>
                <label>
                  Quality
                  <select value={p.quality} onChange={(e) => p.onQuality(e.target.value as QualitySetting)}>
                    <option value="auto">Auto</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </label>
                <label className="check">
                  <input type="checkbox" checked={p.reduced} onChange={(e) => p.onReduced(e.target.checked)} />
                  Reduce motion
                </label>
              </section>
            )}
          </div>
        )}
      </aside>

      <footer className="status">
        {profile.fixture ? 'Synthetic fixture data' : profile.collectedAt ? `GitHub data last changed ${profile.collectedAt.slice(0, 10)} UTC` : 'No data collected yet'}
        {' · '}
        <a href={profile.profile.profileUrl} target="_blank" rel="noopener noreferrer">github.com/{profile.profile.username}</a>
      </footer>
    </div>
  );
}
