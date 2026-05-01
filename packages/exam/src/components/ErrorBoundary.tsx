import React from 'react';

interface Props { children: React.ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#fff' }}>
          <div style={{ textAlign: 'center', padding: 40 }}>
            <p style={{ fontSize: 20, color: '#ff4d4f', marginBottom: 8 }}>页面出现错误</p>
            <p style={{ color: '#999', fontSize: 14, marginBottom: 16 }}>{this.state.error?.message}</p>
            <button
              onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
              style={{ padding: '8px 24px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}
              aria-label="刷新页面"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
