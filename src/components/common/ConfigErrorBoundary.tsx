/**
 * Configuration Error Boundary
 *
 * Catches and displays configuration errors (missing environment variables, etc.)
 * with helpful troubleshooting information.
 */

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ConfigErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('Configuration Error:', error);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      const error = this.state.error;
      const isEnvError = error.message.includes('environment variable');

      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8f9fa',
            padding: '20px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: '600px',
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '32px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: '#dc3545',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '24px',
                  fontWeight: 'bold',
                }}
              >
                !
              </div>
              <h1 style={{ margin: 0, fontSize: '24px', color: '#212529' }}>
                {isEnvError ? 'Configuration Error' : 'Application Error'}
              </h1>
            </div>

            <div
              style={{
                padding: '16px',
                backgroundColor: '#f8d7da',
                border: '1px solid #f5c2c7',
                borderRadius: '4px',
                marginBottom: '20px',
                color: '#842029',
              }}
            >
              <strong>Error:</strong>
              <pre
                style={{
                  margin: '8px 0 0 0',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: '14px',
                }}
              >
                {error.message}
              </pre>
            </div>

            {isEnvError && (
              <>
                <h2 style={{ fontSize: '18px', marginBottom: '12px', color: '#212529' }}>
                  How to fix this:
                </h2>
                <ol style={{ paddingLeft: '20px', color: '#495057', lineHeight: '1.6' }}>
                  <li>
                    <strong>Local Development:</strong>
                    <ul style={{ marginTop: '8px' }}>
                      <li>Copy <code>.env.example</code> to <code>.env</code></li>
                      <li>Fill in your Supabase credentials from the Supabase Dashboard</li>
                      <li>Restart the development server</li>
                    </ul>
                  </li>
                  <li style={{ marginTop: '12px' }}>
                    <strong>Production Deployment (Cloud Run):</strong>
                    <ul style={{ marginTop: '8px' }}>
                      <li>Set environment variables in Cloud Run service configuration</li>
                      <li>Use the <code>deploy.sh</code> script with variables exported</li>
                      <li>Or update via: <code>gcloud run services update divvydo --update-env-vars ...</code></li>
                    </ul>
                  </li>
                </ol>

                <div
                  style={{
                    marginTop: '20px',
                    padding: '16px',
                    backgroundColor: '#cfe2ff',
                    border: '1px solid #9ec5fe',
                    borderRadius: '4px',
                    color: '#084298',
                  }}
                >
                  <strong>Need help?</strong> Check the README.md file for detailed setup instructions,
                  or visit the Supabase Dashboard to get your project credentials.
                </div>
              </>
            )}

            <button
              onClick={() => window.location.reload()}
              style={{
                marginTop: '24px',
                padding: '12px 24px',
                backgroundColor: '#0d6efd',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '16px',
                cursor: 'pointer',
                fontWeight: '500',
              }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
