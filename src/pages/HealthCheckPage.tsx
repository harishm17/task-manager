/**
 * Health Check Page
 *
 * Provides system health information for monitoring and debugging.
 * Used by Cloud Run health checks and ops teams.
 */

import { useEffect, useState } from 'react';
import { env, isDevelopment, isProduction } from '../config/env';
import { supabase } from '../lib/supabaseClient';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    environment: boolean;
    database: boolean;
    auth: boolean;
  };
  info: {
    version: string;
    environment: string;
    timestamp: string;
  };
  error?: string;
}

export default function HealthCheckPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    async function checkHealth() {
      const checks = {
        environment: true, // If we got here, env is valid
        database: false,
        auth: false,
      };

      let error: string | undefined;

      try {
        // Test database connection
        const { error: dbError } = await supabase.from('users').select('count').limit(1);
        checks.database = !dbError;
        if (dbError) error = dbError.message;

        // Test auth connection
        const { error: authError } = await supabase.auth.getSession();
        checks.auth = !authError;
        if (authError && !error) error = authError.message;
      } catch (err) {
        error = err instanceof Error ? err.message : 'Unknown error';
      }

      const allHealthy = Object.values(checks).every(Boolean);
      const anyHealthy = Object.values(checks).some(Boolean);

      setHealth({
        status: allHealthy ? 'healthy' : anyHealthy ? 'degraded' : 'unhealthy',
        checks,
        info: {
          version: env.app.version,
          environment: env.app.environment,
          timestamp: new Date().toISOString(),
        },
        error,
      });
    }

    checkHealth();
  }, []);

  if (!health) {
    return (
      <div style={{ padding: '20px', fontFamily: 'monospace' }}>
        <div>Checking health...</div>
      </div>
    );
  }

  const statusColor =
    health.status === 'healthy' ? '#22c55e' : health.status === 'degraded' ? '#f59e0b' : '#ef4444';

  return (
    <div
      style={{
        padding: '20px',
        fontFamily: 'monospace',
        maxWidth: '800px',
        margin: '0 auto',
      }}
    >
      <h1 style={{ marginBottom: '20px', fontSize: '24px' }}>DivvyDo Health Check</h1>

      <div
        style={{
          padding: '16px',
          backgroundColor: statusColor,
          color: 'white',
          borderRadius: '4px',
          marginBottom: '20px',
          fontSize: '18px',
          fontWeight: 'bold',
        }}
      >
        Status: {health.status.toUpperCase()}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>System Checks</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {Object.entries(health.checks).map(([check, passed]) => (
              <tr key={check} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px', textTransform: 'capitalize' }}>{check}</td>
                <td style={{ padding: '12px', textAlign: 'right' }}>
                  <span style={{ color: passed ? '#22c55e' : '#ef4444' }}>
                    {passed ? '✓ PASS' : '✗ FAIL'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>System Info</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '12px' }}>Version</td>
              <td style={{ padding: '12px', textAlign: 'right' }}>{health.info.version}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '12px' }}>Environment</td>
              <td style={{ padding: '12px', textAlign: 'right' }}>{health.info.environment}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '12px' }}>Timestamp</td>
              <td style={{ padding: '12px', textAlign: 'right' }}>{health.info.timestamp}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '12px' }}>Supabase URL</td>
              <td style={{ padding: '12px', textAlign: 'right', fontSize: '12px' }}>
                {env.supabase.url}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {health.error && (
        <div
          style={{
            padding: '16px',
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '4px',
            color: '#991b1b',
          }}
        >
          <strong>Error:</strong> {health.error}
        </div>
      )}

      {(isDevelopment || isProduction) && (
        <div style={{ marginTop: '20px', fontSize: '12px', color: '#6b7280' }}>
          This page is for monitoring and debugging purposes only.
        </div>
      )}
    </div>
  );
}
