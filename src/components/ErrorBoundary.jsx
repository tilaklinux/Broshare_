import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Page failed to render:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="card mx-auto max-w-xl p-8 text-center">
          <div className="mb-4 text-5xl">⚠️</div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Something went wrong</h1>
          <p className="mb-6 text-gray-500">
            This page could not be displayed. Your account and listings are safe — try reloading.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
              Reload page
            </button>
            <a href="/" className="btn-secondary">Go to Home</a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
