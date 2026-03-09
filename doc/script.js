async function loadConfig() {
  const response = await fetch('./app-config.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Missing app-config.json');
  }
  return response.json();
}

function enableLink(id, href) {
  const el = document.getElementById(id);
  if (!el) return;
  if (href) {
    el.href = href;
    el.setAttribute('aria-disabled', 'false');
  } else {
    el.href = '#';
    el.setAttribute('aria-disabled', 'true');
  }
}

function resolveUrl(url) {
  if (!url) return '';
  try {
    return new URL(url, window.location.href).toString();
  } catch {
    return url;
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

    const iosManifestUrl = resolveUrl(cfg?.ios?.manifestUrl || '');
    const iosIpaUrl = resolveUrl(cfg?.ios?.ipaUrl || '');
    const iosInstallUrl = iosManifestUrl
      ? `itms-services://?action=download-manifest&url=${encodeURIComponent(iosManifestUrl)}`
      : '';

    const androidApkUrl = resolveUrl(cfg?.android?.apkUrl || '');

    enableLink('ios-install', iosInstallUrl);
    enableLink('ios-ipa', iosIpaUrl);
    enableLink('ios-manifest', iosManifestUrl);
    enableLink('android-apk', androidApkUrl);

    setText('version', `Version: ${cfg?.version || '-'}`);
    setText('updated', `Updated: ${cfg?.updatedAt || '-'}`);

    setIosQr(iosInstallUrl);
  } catch (error) {
    console.error(error);
    setText('version', 'Version: configure doc/app-config.json');
    setText('updated', 'Updated: -');
  }
})();
