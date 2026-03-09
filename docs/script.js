async function loadConfig() {
  const response = await fetch('./config.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Missing config.json');
  }
  return response.json();
}

async function fetchLatestGithubRelease(owner, repo) {
  if (!owner || !repo) return null;

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
  const response = await fetch(apiUrl, {
    headers: {
      Accept: 'application/vnd.github+json',
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

function pickReleaseAssetUrl(assets, preferredName, extensions) {
  if (!Array.isArray(assets) || assets.length === 0) return '';

  const byPreferredName = preferredName
    ? assets.find((asset) =>
        String(asset?.name || '')
          .toLowerCase()
          .includes(String(preferredName).toLowerCase())
      )
    : null;

  if (byPreferredName?.browser_download_url) {
    return byPreferredName.browser_download_url;
  }

  const byExtension = assets.find((asset) => {
    const name = String(asset?.name || '').toLowerCase();
    return extensions.some((ext) => name.endsWith(ext));
  });

  return byExtension?.browser_download_url || '';
}

function enableLink(id, href) {
  const el = document.getElementById(id);
  if (!el) return;
  if (href) {
    el.href = href;
    el.setAttribute('aria-disabled', 'false');
    el.setAttribute('data-resolved-href', href);
  } else {
    el.href = '#';
    el.setAttribute('aria-disabled', 'true');
    el.removeAttribute('data-resolved-href');
  }
}

function buildIosInstallUrl(manifestUrl) {
  if (!manifestUrl) return '';

  try {
    const parsed = new URL(manifestUrl);
    if (parsed.protocol !== 'https:') {
      return '';
    }

    const params = new URLSearchParams({
      action: 'download-manifest',
      url: manifestUrl,
    });
    return `itms-services://?${params.toString()}`;
  } catch {
    return '';
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value;
}

function setIosQr(installHref) {
  const qr = document.getElementById('ios-qr');
  if (!qr || !installHref) return;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(installHref)}`;
  qr.src = qrUrl;
  qr.style.display = 'block';
}

(async function init() {
  try {
    const cfg = await loadConfig();

    let releaseVersion = '-';
    let releaseUpdatedAt = '-';

    let iosManifestUrl = '';
    let iosIpaUrl = '';

    const githubOwner = cfg?.github?.owner || '';
    const githubRepo = cfg?.github?.repo || '';
    const autoLatest = cfg?.github?.autoLatest !== false;

    if (autoLatest && githubOwner && githubRepo) {
      const latestRelease = await fetchLatestGithubRelease(githubOwner, githubRepo);
      if (latestRelease) {
        const assets = latestRelease.assets || [];

        const discoveredManifest = pickReleaseAssetUrl(assets, cfg?.github?.manifestAssetName, [
          '.plist',
        ]);
        const discoveredIpa = pickReleaseAssetUrl(assets, cfg?.github?.ipaAssetName, ['.ipa']);

        iosManifestUrl = discoveredManifest || '';
        iosIpaUrl = discoveredIpa || '';

        releaseVersion = latestRelease.tag_name || releaseVersion;
        releaseUpdatedAt = latestRelease.published_at
          ? new Date(latestRelease.published_at).toISOString().slice(0, 10)
          : releaseUpdatedAt;
      }
    }

    const iosInstallUrl = buildIosInstallUrl(iosManifestUrl);

    enableLink('ios-install', iosInstallUrl);
    enableLink('ios-ipa', iosIpaUrl);
    enableLink('ios-manifest', iosManifestUrl);

    setText('version', `Version: ${releaseVersion}`);
    setText('updated', `Updated: ${releaseUpdatedAt}`);

    setIosQr(iosInstallUrl);
  } catch (error) {
    console.error(error);
    setText('version', 'Version: configure doc/app-config.json');
    setText('updated', 'Updated: -');
  }
})();
