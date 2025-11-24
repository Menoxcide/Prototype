# NEX://VOID Deployment Guide

## Prerequisites

- Node.js 18+
- npm/yarn/pnpm
- Server hosting (for Colyseus server)
- Domain name (optional)

## Client Deployment

### Build for Production

```bash
npm run build
```

This creates an optimized build in the `dist/` directory.

### Deploy to Static Hosting

#### Vercel
```bash
npm install -g vercel
vercel
```

#### Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod
```

#### GitHub Pages
1. Update `vite.config.ts` to set `base: '/your-repo-name/'`
2. Build: `npm run build`
3. Deploy `dist/` folder to GitHub Pages

## Server Deployment

### Build Server

```bash
cd server
npm install
npm run build
```

### Deploy Options

#### Fly.io
```bash
cd server
fly launch
fly deploy
```

#### Railway
```bash
cd server
railway up
```

#### Heroku
```bash
cd server
heroku create
git push heroku main
```

### Environment Variables

Set these on your hosting platform:

- `PORT` - Server port (default: 2567)
- `REDIS_URL` - Redis connection URL (for scaling)
- `NODE_ENV` - Set to "production"

## Mobile App Build

### Using Capacitor

```bash
npm install -g @capacitor/cli
npm install @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
npx cap sync
```

### iOS Build

```bash
npx cap open ios
# Build in Xcode
```

### Android Build

```bash
npx cap open android
# Build in Android Studio
```

## Performance Checklist

- [ ] Enable gzip compression
- [ ] Set up CDN for static assets
- [ ] Configure Redis for server scaling
- [ ] Set up monitoring (Sentry, etc.)
- [ ] Enable HTTPS
- [ ] Set up CORS properly
- [ ] Configure rate limiting
- [ ] Set up backup system

## Launch Checklist

- [ ] All features tested
- [ ] Performance optimized
- [ ] Mobile builds created
- [ ] App Store/Play Store submissions
- [ ] Marketing materials ready
- [ ] Server monitoring set up
- [ ] Backup and recovery plan
- [ ] Support system ready

