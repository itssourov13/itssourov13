import { useMemo, useState } from 'react';
import { ACTIVITY_LABELS } from '../../../shared/activity.ts';
import { sceneProjects } from '../data/parse.ts';
import type { WorldProfile } from '../data/parse.ts';
import type { QualityLevel, QualitySetting } from '../effects/quality.ts';
import { stepIndex } from '../state/selection.ts';
import type { Stop } from '../scene/stops.ts';

const SOCIAL_LABELS: Record<string, string> = { github: 'GitHub', linkedin: 'LinkedIn', x: 'X', facebook: 'Facebook', instagram: 'Instagram', blog: 'Blog', portfolio: 'Portfolio' };
const STALE_DAYS = 3;

export interface OverlayProps {
  profile: WorldProfile;
  sceneActive: boolean; // false → 3D unavailable, show the summary as the page
  notice?: string;
  stops: Stop[];
  stopId: string;
  onStop: (id: string) => void;
  setting: QualitySetting;
  level: QualityLevel;
  onSetting: (q: QualitySetting) => void;
  reduced: boolean;
  onReduced: (v: boolean) => void;
  paused: boolean;
  onPaused: (v: boolean) => void;
  onResetPrefs: () => void;
  selected: string | null;
  onSelect: (n: string | null) => void;
  hovered: string | null;
  onHover: (n: string | null) => void;
  announcement: string;
  narrow: boolean;
}

/**
 * Every meaningful 3D concept has a DOM equivalent here: project nodes ↔ project list/buttons,
 * camera zones ↔ tour buttons, settings ↔ form controls, link portals ↔ Links list.
 */
export function Overlay(p: OverlayProps) {
  const [open, setOpen] = useState(!p.narrow);
  const { profile } = p;
  const projects = useMemo(() => sceneProjects(profile), [profile]);
  const panelOpen = open || !p.sceneActive;
  const selIdx = projects.findIndex((x) => x.name === p.selected);
  const sel = selIdx >= 0 ? projects[selIdx]! : null;
  const staleDays = useMemo(() => {
    if (!profile.collectedAt || profile.fixture) return 0;
    return Math.floor((Date.now() - Date.parse(profile.collectedAt)) / 86_400_000);
  }, [profile]);
  const step = (dir: 1 | -1) => {
    const i = stepIndex(selIdx >= 0 ? selIdx : null, projects.length, dir);
    if (i !== null) p.onSelect(projects[i]!.name);
  };

  return (
    <main className={`hud${p.sceneActive ? '' : ' flat'}`} onKeyDown={(e) => { if (e.key === 'Escape' && p.selected) p.onSelect(null); }}>
      <a className="skip" href="#details" onClick={(e) => { e.preventDefault(); setOpen(true); window.setTimeout(() => document.getElementById('details')?.focus(), 0); }}>Skip to details</a>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{p.announcement}</div>

      <header className="brand">
        <p className="eyebrow">{profile.world.title}</p>
        <h1>{profile.profile.displayName}</h1>
        <p className="headline">{profile.profile.headline}</p>
      </header>

      {p.sceneActive && (
        <nav className="tour" aria-label="Camera positions">
          {p.stops.map((s) => (
            <button key={s.id} type="button" aria-pressed={p.stopId === s.id} onClick={() => p.onStop(s.id)}>{s.label}</button>
          ))}
        </nav>
      )}

      <aside id="details" tabIndex={-1} className={`panel${panelOpen ? ' open' : ''}`} aria-label="Profile details">
        {p.sceneActive && (
          <button type="button" className="panel-toggle" aria-expanded={panelOpen} aria-controls="details-body" onClick={() => setOpen(!open)}>
            {panelOpen ? 'Hide details' : 'Show details'}
          </button>
        )}
        {panelOpen && (
          <div className="panel-body" id="details-body">
            {p.notice && <p className="notice" role="status">{p.notice}</p>}
            {profile.status === 'unavailable' && <p className="notice" role="status">GitHub data has not been collected yet. It appears after the first scheduled update.</p>}
            {staleDays >= STALE_DAYS && <p className="notice" role="status">Data last updated {staleDays} days ago ({profile.collectedAt?.slice(0, 10)}).</p>}
            {profile.profile.bio.map((b) => <p key={b}>{b}</p>)}

            {profile.stats && (
              <dl className="stats">
                <div><dt>Public repos</dt><dd>{profile.stats.publicRepos}</dd></div>
                <div><dt>Followers</dt><dd>{profile.stats.followers}</dd></div>
                {profile.stats.totalContributions !== null && <div><dt>Contributions, 12 mo</dt><dd>{profile.stats.totalContributions.toLocaleString('en-US')}</dd></div>}
                <div><dt>Stars</dt><dd>{profile.stats.totalStars}</dd></div>
                {profile.stats.momentum && <div className="wide"><dt>Last 30 days vs previous 30</dt><dd>{profile.stats.momentum.last30} <span className="muted">vs {profile.stats.momentum.prev30}</span></dd></div>}
              </dl>
            )}

            {sel && (
              <section aria-labelledby="h-selected" className="selected">
                <h2 id="h-selected">Selected project</h2>
                <h3>{sel.name}{sel.archived ? ' (archived)' : ''}</h3>
                <p>{sel.description || 'No description provided.'}</p>
                <dl className="facts">
                  {sel.language && <><dt>Language</dt><dd>{sel.language}</dd></>}
                  <dt>Status</dt><dd>{ACTIVITY_LABELS[sel.activity]}</dd>
                  <dt>Last push</dt><dd>{sel.pushedAt.slice(0, 10)}</dd>
                  <dt>Created</dt><dd>{sel.createdAt.slice(0, 10)}</dd>
                  <dt>Stars / forks</dt><dd>{sel.stars} / {sel.forks}</dd>
                  {sel.release && <><dt>Latest release</dt><dd>{sel.release}</dd></>}
                </dl>
                {sel.topics.length > 0 && <p className="muted">{sel.topics.map((t) => `#${t}`).join(' ')}</p>}
                <div className="actions">
                  <a className="btn" href={sel.url} target="_blank" rel="noopener noreferrer">Open repository<span className="sr-only"> (opens in a new tab)</span></a>
                  <button type="button" className="btn" onClick={() => p.onSelect(null)}>Clear selection</button>
                </div>
              </section>
            )}

            {projects.length > 0 && (
              <section aria-labelledby="h-projects">
                <h2 id="h-projects">Projects</h2>
                <div className="actions">
                  <button type="button" className="btn" onClick={() => step(-1)}>Previous project</button>
                  <button type="button" className="btn" onClick={() => step(1)}>Next project</button>
                </div>
                <ul className="projects">
                  {projects.map((pr) => (
                    <li key={pr.name} className={p.selected === pr.name ? 'on' : p.hovered === pr.name ? 'hover' : ''} onMouseEnter={() => p.onHover(pr.name)} onMouseLeave={() => p.onHover(null)}>
                      <button type="button" aria-pressed={p.selected === pr.name} onClick={() => p.onSelect(pr.name)} onFocus={() => p.onHover(pr.name)} onBlur={() => p.onHover(null)}>{pr.name}</button>
                      <span className="meta">{[pr.language, ACTIVITY_LABELS[pr.activity]].filter(Boolean).join(' · ')}</span>
                      <a href={pr.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${pr.name} on GitHub (new tab)`}>↗</a>
                    </li>
                  ))}
                </ul>
                <p className="muted small">Node colour in the 3D view shows activity: Active ≤ 30 days, Recent ≤ 90, Quiet ≤ 1 year, Dormant beyond. Lines connect projects that share a topic or language.</p>
              </section>
            )}

            {profile.languages && (
              <section aria-labelledby="h-langs">
                <h2 id="h-langs">Languages</h2>
                <p className="muted">{profile.languages.basis === 'bytes' ? 'Share of code across public non-fork repositories' : 'Primary language per public non-fork repository'}</p>
                <p>{profile.languages.items.map((i) => `${i.name} ${i.percent.toFixed(1)}%`).join(' · ')}</p>
              </section>
            )}

            {profile.profile.focus.length > 0 && (
              <section aria-labelledby="h-focus">
                <h2 id="h-focus">Focus</h2>
                <ul className="plain">{profile.profile.focus.map((f) => <li key={f}>{f}</li>)}</ul>
              </section>
            )}

            <section aria-labelledby="h-links">
              <h2 id="h-links">Links</h2>
              <ul className="links">
                {Object.entries(profile.profile.socials).map(([k, url]) => <li key={k}><a href={url} target="_blank" rel="noopener noreferrer">{SOCIAL_LABELS[k] ?? k}</a></li>)}
                {profile.media.introVideoUrl && <li><a href={profile.media.introVideoUrl} target="_blank" rel="noopener noreferrer">Intro video</a></li>}
              </ul>
            </section>

            {p.sceneActive && (
              <section aria-labelledby="h-settings" className="settings">
                <h2 id="h-settings">Display</h2>
                <label>Quality
                  <select value={p.setting} onChange={(e) => p.onSetting(e.target.value as QualitySetting)}>
                    <option value="auto">Auto</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                  </select>
                </label>
                <label className="check"><input type="checkbox" checked={p.reduced} onChange={(e) => p.onReduced(e.target.checked)} /> Reduce motion (no camera flights, no ambient motion)</label>
                <label className="check"><input type="checkbox" checked={p.paused || p.reduced} disabled={p.reduced} onChange={(e) => p.onPaused(e.target.checked)} /> Pause ambient motion</label>
                <p className="muted small">Rendering at {p.level} quality{p.setting === 'auto' ? ' (adjusts automatically)' : ''}.</p>
                <button type="button" className="btn" onClick={p.onResetPrefs}>Reset display settings</button>
              </section>
            )}
          </div>
        )}
      </aside>

      <footer className="status">
        {profile.fixture ? 'Synthetic fixture data' : profile.collectedAt ? `GitHub data last changed ${profile.collectedAt.slice(0, 10)} UTC` : 'No data collected yet'}
        {' · '}<a href={profile.profile.profileUrl} target="_blank" rel="noopener noreferrer">github.com/{profile.profile.username}</a>
      </footer>
    </main>
  );
}
