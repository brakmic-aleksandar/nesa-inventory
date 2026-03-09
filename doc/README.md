# Ad Hoc Download Page (`/doc`)

This folder contains a static page suitable for GitHub Pages deployment.

## Files

- `index.html`: download portal UI
- `styles.css`: page styling
- `script.js`: loads links from config and generates iOS install QR
- `app-config.json`: release links and metadata
- `manifest.plist`: Apple ad hoc manifest template

## Configure links

Edit `doc/app-config.json` with your real release URLs or keep relative links:

- `ios.manifestUrl`: link to `manifest.plist` (default: `./manifest.plist`)
- `ios.ipaUrl`: link to your `app.ipa` (default: `./app.ipa`)
- `android.apkUrl`: optional APK link
- `version`, `updatedAt`: display metadata

## iOS ad hoc notes

- `manifest.plist` and `app.ipa` must be reachable over HTTPS.
- Update `doc/manifest.plist` values before release:
  - `assets[0].url` -> your final HTTPS IPA URL
  - `metadata.bundle-identifier` -> your app bundle id
  - `metadata.bundle-version` -> build/version string
- Test device UDIDs must be included in your ad hoc provisioning profile.
- Install button uses `itms-services://?action=download-manifest&url=<manifestUrl>`.

## GitHub Pages

A workflow is included at `.github/workflows/deploy-doc-pages.yml` to publish this exact `/doc` folder via GitHub Actions.
