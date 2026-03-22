#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function ensureHttps(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function readAppConfig(projectRoot) {
  const appJsonPath = path.join(projectRoot, 'app.json');
  const raw = fs.readFileSync(appJsonPath, 'utf8');
  const parsed = JSON.parse(raw);
  return parsed.expo || {};
}

function buildManifest({ ipaUrl, bundleId, bundleVersion, title }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>items</key>
    <array>
      <dict>
        <key>assets</key>
        <array>
          <dict>
            <key>kind</key>
            <string>software-package</string>
            <key>url</key>
            <string>${escapeXml(ipaUrl)}</string>
          </dict>
        </array>
        <key>metadata</key>
        <dict>
          <key>bundle-identifier</key>
          <string>${escapeXml(bundleId)}</string>
          <key>bundle-version</key>
          <string>${escapeXml(bundleVersion)}</string>
          <key>kind</key>
          <string>software</string>
          <key>title</key>
          <string>${escapeXml(title)}</string>
        </dict>
      </dict>
    </array>
  </dict>
</plist>
`;
}

function main() {
  const projectRoot = process.cwd();
  const args = parseArgs(process.argv.slice(2));
  const expo = readAppConfig(projectRoot);

  const outPath = path.resolve(projectRoot, args.out || 'docs/ios/manifest.plist');
  const bundleId = args['bundle-id'] || expo?.ios?.bundleIdentifier || 'com.example.app';
  const bundleVersion = args.version || expo?.version || '1.0.0';
  const title = args.title || expo?.name || 'App';

  const ipaUrl = args['ipa-url'] || process.env.IPA_URL;
  if (!ipaUrl) {
    console.error(
      'IPA URL is required. Provide --ipa-url https://... or set IPA_URL environment variable.'
    );
    process.exit(1);
  }
  if (!ensureHttps(ipaUrl)) {
    console.error('IPA URL must be a valid HTTPS URL for iOS ad hoc install.');
    process.exit(1);
  }

  const plist = buildManifest({
    ipaUrl,
    bundleId,
    bundleVersion,
    title,
  });

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, plist, 'utf8');

  console.log(`Generated iOS manifest at: ${outPath}`);
  console.log(`bundleIdentifier: ${bundleId}`);
  console.log(`version: ${bundleVersion}`);
  console.log(`title: ${title}`);
  console.log(`ipaUrl: ${ipaUrl}`);
}

main();
