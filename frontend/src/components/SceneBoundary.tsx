import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Called once when the 3D layer dies, so App can unlock the page immediately. */
  onError: () => void
}

/**
 * Catches anything thrown by the WebGL layer.
 *
 * react-three-fiber builds the WebGLRenderer inside a layout effect, so a GPU
 * blocklist, a disabled-GPU flag, or a failed context creation throws during
 * render. Without a boundary that error unmounts the React root — taking <main>
 * and the entire portfolio with it. The site must survive losing its background.
 */
export class SceneBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[scene] 3D layer failed, continuing without it', error, info.componentStack)
    this.props.onError()
  }

  render() {
    // Render nothing on failure: the page keeps its ink background and every
    // section stays readable. Losing the figurine is a downgrade, not an outage.
    return this.state.failed ? null : this.props.children
  }
}
