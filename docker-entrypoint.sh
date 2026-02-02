#!/bin/sh
set -e

# Inject environment variables into the built JavaScript files at runtime
# This allows Cloud Run to inject secrets without rebuilding the image

echo "Injecting environment variables..."

# Create a JavaScript file with runtime environment variables
cat > /usr/share/nginx/html/env-config.js << EOF
window.ENV = {
  VITE_SUPABASE_URL: "${VITE_SUPABASE_URL}",
  VITE_SUPABASE_ANON_KEY: "${VITE_SUPABASE_ANON_KEY}"
};
EOF

# Inject the env-config.js script into index.html if not already present
if ! grep -q "env-config.js" /usr/share/nginx/html/index.html; then
  sed -i 's|</head>|<script src="/env-config.js"></script></head>|' /usr/share/nginx/html/index.html
fi

echo "Environment variables injected successfully"

# Execute the main command
exec "$@"
