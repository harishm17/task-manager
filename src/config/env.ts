/**
 * Environment Configuration and Validation
 *
 * Validates required environment variables at runtime and provides
 * type-safe access to configuration values.
 */

interface EnvironmentConfig {
  supabase: {
    url: string;
    anonKey: string;
  };
  app: {
    environment: 'development' | 'production' | 'test';
    version: string;
  };
}

/**
 * Validates that a required environment variable is present
 */
function requireEnv(key: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Please ensure ${key} is set in your environment or .env file.\n` +
      `See .env.example for configuration template.`
    );
  }
  return value;
}

/**
 * Validates URL format
 */
function validateUrl(key: string, value: string): string {
  try {
    new URL(value);
    return value;
  } catch {
    throw new Error(
      `Invalid URL format for ${key}: ${value}\n` +
      `Expected a valid URL like https://example.com`
    );
  }
}

/**
 * Validates Supabase configuration
 */
function validateSupabaseConfig(url: string, key: string): void {
  // Check URL format
  if (!url.includes('supabase.co') && !url.includes('localhost')) {
    console.warn(
      `Warning: VITE_SUPABASE_URL doesn't appear to be a Supabase URL: ${url}`
    );
  }

  // Check anon key format (should be a JWT)
  if (!key.includes('.')) {
    console.warn(
      `Warning: VITE_SUPABASE_ANON_KEY doesn't appear to be a valid JWT token`
    );
  }
}

/**
 * Load and validate environment configuration
 */
function loadEnvironmentConfig(): EnvironmentConfig {
  // In production builds, environment variables may be injected at runtime
  // via window.ENV (see docker-entrypoint.sh)
  const getEnvVar = (key: string): string | undefined => {
    // Check runtime injection first (Docker/Cloud Run)
    if (typeof window !== 'undefined' && (window as any).ENV) {
      const value = (window as any).ENV[key];
      if (value) return value;
    }

    // Fall back to build-time environment variables
    return import.meta.env?.[key];
  };

  // Get environment variables
  const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
  const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');
  const nodeEnv = import.meta.env?.MODE || 'development';

  // In test mode, use default test values if not provided
  const isTestMode = nodeEnv === 'test';
  if (isTestMode && (!supabaseUrl || !supabaseAnonKey)) {
    return {
      supabase: {
        url: supabaseUrl || 'https://test-project.supabase.co',
        anonKey: supabaseAnonKey || 'test-anon-key.test.jwt',
      },
      app: {
        environment: 'test',
        version: import.meta.env?.VITE_APP_VERSION || '1.0.0-test',
      },
    };
  }

  // Validate required variables
  const validatedUrl = validateUrl(
    'VITE_SUPABASE_URL',
    requireEnv('VITE_SUPABASE_URL', supabaseUrl)
  );

  const validatedKey = requireEnv('VITE_SUPABASE_ANON_KEY', supabaseAnonKey);

  // Additional validation for Supabase config
  validateSupabaseConfig(validatedUrl, validatedKey);

  // Get app version from package.json (injected at build time)
  const version = import.meta.env.VITE_APP_VERSION || '1.0.0';

  return {
    supabase: {
      url: validatedUrl,
      anonKey: validatedKey,
    },
    app: {
      environment: nodeEnv as 'development' | 'production' | 'test',
      version,
    },
  };
}

/**
 * Global environment configuration
 *
 * Throws an error if required environment variables are missing
 */
export const env = loadEnvironmentConfig();

/**
 * Check if running in development mode
 */
export const isDevelopment = env.app.environment === 'development';

/**
 * Check if running in production mode
 */
export const isProduction = env.app.environment === 'production';

/**
 * Check if running in test mode
 */
export const isTest = env.app.environment === 'test';

/**
 * Log environment configuration (safe for production)
 */
export function logEnvironmentInfo(): void {
  console.log('🌍 Environment Configuration:');
  console.log(`  Mode: ${env.app.environment}`);
  console.log(`  Version: ${env.app.version}`);
  console.log(`  Supabase URL: ${env.supabase.url}`);
  console.log(`  Anon Key: ${env.supabase.anonKey.substring(0, 20)}...`);
}

// Log on initialization (development only)
if (isDevelopment) {
  logEnvironmentInfo();
}
