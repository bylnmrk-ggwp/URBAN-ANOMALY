import { Component, type ErrorInfo, type ReactNode } from 'react'

import { ErrorState } from '@/components/common/ErrorState'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: unknown
}

/**
 * Last line of defence for render-time crashes. Pages handle their own data
 * errors with `ErrorState`; this only catches what escapes them.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('Unhandled render error', error, info.componentStack)
  }

  render() {
    if (this.state.error === null) return this.props.children
    return (
      <div className="container-x flex min-h-screen items-center justify-center py-16">
        <ErrorState
          title="The page could not be displayed"
          error={this.state.error}
          onRetry={() => window.location.reload()}
          className="w-full max-w-lg"
        />
      </div>
    )
  }
}
