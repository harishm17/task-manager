/**
 * Service Worker Registration
 * Registers the service worker and handles updates
 */

export function registerServiceWorker(): void {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('[SW] Registered:', registration.scope);

          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000); // Check every hour

          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available
                console.log('[SW] New version available');
                showUpdateNotification(registration);
              }
            });
          });
        })
        .catch((error) => {
          console.error('[SW] Registration failed:', error);
        });

      // Listen for controller change (new SW activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW] Controller changed, reloading...');
        window.location.reload();
      });
    });
  }
}

function showUpdateNotification(registration: ServiceWorkerRegistration): void {
  // Create a simple update notification
  const shouldUpdate = confirm(
    'A new version of DivvyDo is available. Reload to update?'
  );

  if (shouldUpdate) {
    const waiting = registration.waiting;
    if (waiting) {
      waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }
}

// Install prompt for PWA
let deferredPrompt: any;

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;

  // Optionally, show your own install button
  console.log('[PWA] Install prompt available');
});

window.addEventListener('appinstalled', () => {
  console.log('[PWA] App installed successfully');
  deferredPrompt = null;
});

export function promptInstall(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!deferredPrompt) {
      resolve(false);
      return;
    }

    deferredPrompt.prompt();

    deferredPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('[PWA] User accepted install prompt');
        resolve(true);
      } else {
        console.log('[PWA] User dismissed install prompt');
        resolve(false);
      }
      deferredPrompt = null;
    });
  });
}
