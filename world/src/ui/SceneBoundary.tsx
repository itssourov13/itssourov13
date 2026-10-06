import { Component } from 'react';
import type { ReactNode } from 'react';

/** Catches render-time failures of the 3D scene so the DOM summary stays usable. */
export class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch() {
    this.props.onError();
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}
