# valorant-store

Android app (Expo) for checking your Valorant store from your phone.

- Daily offers, night market, featured bundle and the Kingdom Credits accessory store
- Wallet balances (VP, Kingdom Credits, Radianite)
- Tap a skin to see its variants and play the in-game preview video for each upgrade level
- Wishlist: search any skin, and get a notification when one appears in your store

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
- The WebView keeps Riot's session cookie. After that, every launch, pull-to-refresh and background check signs in silently: `expo/fetch` with `credentials: 'include'` shares the WebView's cookie store on Android, and `redirect: 'manual'` lets the app read the fresh token from Riot's redirect (`silentAuth()` in `src/lib/riot.ts`).
- When Riot's session expires (roughly 1 to 3 weeks), the login page appears again.

## Wishlist alerts

Turn on **Store alerts** in the Wishlist tab. A background task (`src/lib/alerts.ts`, defined in `index.ts` so it exists before anything renders) contacts Riot once per store rotation. Android can't run code at an exact time, so the task wakes about every 30 minutes and returns immediately until the store has reset; the alert lands within roughly 30 minutes of the reset, or later if Android defers it (battery saver). A night market that opens mid-rotation is picked up at the next daily reset. Each find is notified once per store rotation, and nothing is sent for skins you've already seen in the app. **Check now** runs the same check immediately, which is also the quickest way to confirm silent sign-in works on your phone.

## Data

The app then calls Riot's entitlements, userinfo, region and storefront endpoints directly. Skin names, images and rarity come from [valorant-api.com](https://valorant-api.com). Endpoint reference: [valapidocs](https://valapidocs.techchrism.me/).

These are unofficial Riot client APIs and can change without notice.

## Releases

`.github/workflows/release.yml` builds a signed APK on GitHub's runners and publishes it as a GitHub Release.

```bash
git tag v1.0.0 && git push origin v1.0.0
```

- The tag sets the app version: `v1.2.3` becomes version `1.2.3` with versionCode `10203` (see `app.config.js`). Always increase it, or Android refuses to install over the older APK.
- **Run workflow** in the Actions tab builds a test APK as an artifact (version `0.0.<run number>`) without publishing a release. Its low versionCode means it won't install over a tagged release; uninstall first.
- Release builds are signed by `plugins/withReleaseSigning.js` using these repository secrets:

  | Secret | Value |
  |---|---|
  | `ANDROID_KEYSTORE_BASE64` | the keystore, base64-encoded |
  | `ANDROID_KEYSTORE_PASSWORD` | keystore and key password |
  | `ANDROID_KEY_ALIAS` | key alias |

Keep a backup of the keystore. Every update must be signed with the same key, or it can't be installed over the existing app.
