# valorant-store

Android app (Expo) that shows your own Valorant daily store, night market and bundles.

## Run on your phone

1. Install **Expo Go** from the Play Store.
2. Log in to a free Expo account once (`npx expo login`), then start the dev server from WSL:

   ```bash
   npx expo start --tunnel
   ```

   Tunnel mode is needed because your phone can't reach a server inside WSL directly. Without an Expo account, `npx expo start --tunnel ngrok` works instead.
3. Scan the QR code with Expo Go.

## How login works

- The app loads Riot's login page in a WebView. Log in once with your Riot ID; Google/Apple sign-in usually doesn't work inside WebViews.
- The WebView keeps Riot's session cookie. On every launch or pull-to-refresh, the app loads the login URL in a hidden WebView, Riot redirects straight back with a fresh token, and you never see the login screen.
- When Riot's session expires (roughly 1 to 3 weeks), the login page appears again.

The app then calls Riot's entitlements, userinfo, region and storefront endpoints directly. Skin names, images and rarity come from [valorant-api.com](https://valorant-api.com). Endpoint reference: [valapidocs](https://valapidocs.techchrism.me/).

These are unofficial Riot client APIs and can change without notice.
