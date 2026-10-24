# Val Store

Check your VALORANT store from your phone, without opening your PC.

- **Daily store**, **night market**, **featured bundle** and the **accessory store**, with a countdown to the next reset
- **Wallet**: your VP, Kingdom Credits and Radianite
- **Skin previews**: tap any skin to see its variants and watch the in-game video for every upgrade level
- **Wishlist alerts**: pick the skins you want and get a notification when one shows up in your store

> Val Store is a fan-made app. It isn't affiliated with or endorsed by Riot Games. VALORANT and Riot Games are trademarks of Riot Games, Inc.

## Is it safe?

- **Your password never touches Val Store.** You sign in on Riot's own login page. The app doesn't see, read or store your username or password.
- **No servers, no tracking.** There's no Val Store backend, account, analytics or ads. Your session and wishlist stay on your phone.
- **Read-only.** Val Store only looks at your store and wallet. It never buys, spends or changes anything on your account.
- **Sign out any time** in Settings, which removes your session from the phone.
- **Open source.** All of the app's code is in this repository, so anyone can check these claims.

Read the full [privacy policy](PRIVACY.md).

As with any unofficial app, use it at your own risk. Riot can change things on their side at any time, which may stop the app working until it's updated.

## Install

1. Download the latest `val-store-x.y.z.apk` from [Releases](../../releases).
2. Open it on your Android phone. If asked, allow your browser to install apps.
3. Open Val Store and sign in with your Riot ID and password. Google and Apple sign-in aren't supported.

New versions install over the old one and keep you signed in.

## Wishlist alerts

In the **Wishlist** tab, search for skins and tap the heart. Then turn on **Store alerts**. Val Store checks once each time your store resets and notifies you if anything on your wishlist is in it.

Alerts usually arrive within about 30 minutes of the reset. Android decides the exact timing, and battery saver can delay it. If alerts don't arrive, set Val Store's battery usage to **Unrestricted** in Android settings.

---

## Development

```bash
npm ci
npx expo start --tunnel ngrok
```

Scan the QR code with Expo Go. Background alerts are best tested in a release build.

### Releases

`.github/workflows/release.yml` builds a signed APK on GitHub's runners and publishes it as a GitHub Release when you push a version tag:

```bash
git tag v1.0.0 && git push origin v1.0.0
```

- The tag sets the app version: `v1.2.3` becomes version `1.2.3` with versionCode `10203` (`app.config.js`). Always increase it, or Android won't install over the older APK.
- **Run workflow** in the Actions tab builds a test APK as an artifact (version `0.0.<run number>`) without publishing a release. Its low versionCode means it won't install over a tagged release; uninstall first.
- Release builds are signed by `plugins/withReleaseSigning.js` using these repository secrets:

  | Secret | Value |
  |---|---|
  | `ANDROID_KEYSTORE_BASE64` | the keystore, base64-encoded |
  | `ANDROID_KEYSTORE_PASSWORD` | keystore and key password |
  | `ANDROID_KEY_ALIAS` | key alias |

Keep a backup of the keystore. Every update must be signed with the same key, or it can't be installed over the existing app.

## License

[MIT](LICENSE)
