#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

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

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
    ...options,
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} exited with code ${result.status}`);
  }
}

function ensureHttps(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}

function tryReadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function resolveDefaultBaseUrl(projectRoot) {
  const docsConfigPath = path.join(projectRoot, 'docs', 'config.json');
  const docsConfig = tryReadJson(docsConfigPath);
  const owner = docsConfig?.github?.owner;
  const repo = docsConfig?.github?.repo;

  if (owner && repo) {
    return `https://${owner}.github.io/${repo}`;
  }

  return '';
}

function readAppConfig(projectRoot) {
  const appJsonPath = path.join(projectRoot, 'app.json');
  const raw = fs.readFileSync(appJsonPath, 'utf8');
  const parsed = JSON.parse(raw);
  return parsed.expo || {};
}

function constructGitHubReleasesUrl(ipaName, owner, repo, version) {
  if (!owner || !repo || !version) {
    return null;
  }

  return `https://github.com/${owner}/${repo}/releases/download/${version}/${ipaName}`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const projectRoot = process.cwd();

  const outputDir = path.resolve(projectRoot, args['output-dir'] || 'build');
  const ipaName = args['ipa-name'] || 'app.ipa';
  const ipaOutputPath = path.join(outputDir, ipaName);
  const manifestOutputPath = path.join(outputDir, 'manifest.plist');

  const profile = args.profile || 'adhoc';
  const platform = 'ios';
  const skipBuild = Boolean(args['skip-build']);

  fs.mkdirSync(outputDir, { recursive: true });

  if (!skipBuild) {
    console.log(`[build] Running local EAS build (${platform}/${profile})...`);
    runCommand('eas', [
      'build',
      '--platform',
      platform,
      '--profile',
      profile,
      '--local',
      '--output',
      ipaOutputPath,
    ]);
  }

  let ipaUrl = args['ipa-url'] || process.env.IPA_URL || '';
  if (!ipaUrl) {
    const githubOwner = args['github-owner'] || 'brakmic-aleksandar';
    const githubRepo = args['github-repo'] || 'nesa-inventory';
    const expo = readAppConfig(projectRoot);
    const version = expo?.version;

    const githubUrl = constructGitHubReleasesUrl(ipaName, githubOwner, githubRepo, version);
    if (githubUrl) {
      ipaUrl = githubUrl;
    } else {
      const baseUrl = (
        args['base-url'] ||
        process.env.BASE_URL ||
        resolveDefaultBaseUrl(projectRoot)
      ).trim();
      if (!baseUrl) {
        throw new Error(
          'Missing IPA URL. Provide --ipa-url https://... or --base-url https://... (used as <base-url>/<ipa-name>). Note: Default GitHub repo is brakmic-aleksandar/nesa-inventory; override with --github-owner and --github-repo.'
        );
      }
      ipaUrl = `${baseUrl.replace(/\/+$/, '')}/${ipaName}`;
    }
  }

  if (!ensureHttps(ipaUrl)) {
    throw new Error(`IPA URL must be HTTPS for ad hoc install. Received: ${ipaUrl}`);
  }

  console.log('[manifest] Generating manifest...');
  const manifestArgs = [
    'scripts/generate_ios_manifest.js',
    '--ipa-url',
    ipaUrl,
    '--out',
    manifestOutputPath,
  ];

  if (args['bundle-id']) {
    manifestArgs.push('--bundle-id', args['bundle-id']);
  }
  if (args.version) {
    manifestArgs.push('--version', args.version);
  }
  if (args.title) {
    manifestArgs.push('--title', args.title);
  }

  runCommand('node', manifestArgs, { cwd: projectRoot });

  const infoPath = path.join(outputDir, 'release-info.json');
  const releaseInfo = {
    generatedAt: new Date().toISOString(),
    profile,
    ipaPath: ipaOutputPath,
    ipaUrl,
    manifestPath: manifestOutputPath,
  };
  fs.writeFileSync(infoPath, JSON.stringify(releaseInfo, null, 2), 'utf8');

  console.log('Done. Artifacts:');
  console.log(`- IPA: ${ipaOutputPath}`);
  console.log(`- Manifest: ${manifestOutputPath}`);
  console.log(`- Info: ${infoPath}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
