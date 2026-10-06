/** Content-shaped skeleton shown while the profile JSON loads (never a blank screen). */
export function ProfileSkeleton() {
  return (
    <div className="center skeleton" role="status" aria-live="polite">
      <p className="eyebrow">SOUROV // DIGITAL WORLD</p>
      <div className="sk-line w60" />
      <div className="sk-line w40" />
      <p className="muted">Loading profile data…</p>
    </div>
  );
}

/** Shown over the stage while the 3D chunk downloads / initializes. */
export function SceneLoading() {
  return (
    <div className="scene-loading" role="status">
      <span className="dot" aria-hidden="true" /> Preparing 3D scene…
    </div>
  );
}
