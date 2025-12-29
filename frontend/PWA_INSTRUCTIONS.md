# Converting to a Progressive Web App (PWA)

To make your Next.js application installable on mobile devices (PWA), follow these steps:

## 1. Install `next-pwa`

This plugin handles the service worker generation automatically.

```bash
npm install next-pwa
```

## 2. Configure `next.config.js` or `next.config.mjs`

Wrap your Next.js config with the PWA plugin.

```javascript
// next.config.mjs
import withPWA from 'next-pwa';

const nextConfig = {
  // your existing config
};

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // Disable in dev mode
})(nextConfig);
```

## 3. Create a Manifest File

Create `public/manifest.json`. This file tells the browser how your app should behave when installed.

```json
{
  "name": "CyberGaar Audit Platform",
  "short_name": "CyberGaar",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

*Note: You need to generate icons (192x192 and 512x512) and place them in `public/icons/`.*

## 4. Update `layout.tsx` (Metadata)

Ensure your `layout.tsx` includes the manifest link and theme color.

```typescript
export const metadata: Metadata = {
  title: 'CyberGaar Audit Platform',
  description: 'AI-Powered Auditing Platform',
  manifest: '/manifest.json', // Link to manifest
  themeColor: '#000000',      // Match theme_color
};
```

## 5. Verify

1. Run `npm run build` and `npm start`.
2. Open the app in Chrome/Safari.
3. You should see an "Install" icon in the address bar (Desktop) or "Add to Home Screen" option (Mobile).
