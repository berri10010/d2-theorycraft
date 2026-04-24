'use client';

import React from 'react';

interface Props {
  children: React.ReactNode;
  /** Optional custom fallback UI. If omitted, a default error card is shown. */
  fallback?: React.ReactNode;
  /** Optional label shown in the default error card, e.g. "Weapon Perks". */
  label?: string;
}

interface State {
  hasError: boolean;
  message?: string;
}

/**
 * Per-panel error boundary.
 *
 * Wrap any panel that performs non-trivial rendering so a crash in one panel
 * doesn't bring down the whole editor. The default fallback is a small
 * dismissible error card with a "Try again" button that resets the boundary.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message ?? 'Unknown error' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, message: undefined });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <span className="text-red-400 text-lg leading-none mt-0.5">⚠</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-300">
              {this.props.label ? `${this.props.label} failed to render` : 'Panel failed to render'}
            </p>
            {this.state.message && (
              <p className="text-[10px] text-red-400/70 mt-0.5 font-mono truncate">
                {this.state.message}
              </p>
            )}
          </div>
          <button
            onClick={this.reset}
            className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors shrink-0 border border-red-500/30 px-2 py-1 rounded"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
