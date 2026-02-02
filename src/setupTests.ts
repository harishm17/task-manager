import '@testing-library/jest-dom';

// Mock environment variables for tests
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_SUPABASE_URL: 'https://test-project.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-anon-key.test.jwt',
    VITE_APP_VERSION: '1.0.0-test',
    MODE: 'test',
  },
  writable: true,
});
