import type { PlatformFamily } from './types';

type WindowsRelease = {
  build: number;
  version: string;
  displayName: string;
  status: 'supported' | 'edition-dependent';
  latestBuild: string;
};

const windowsReleases: WindowsRelease[] = [
  { build: 28000, version: '26H1', displayName: 'Windows 11, version 26H1', status: 'supported', latestBuild: '28000.2704' },
  { build: 26200, version: '25H2', displayName: 'Windows 11, version 25H2', status: 'supported', latestBuild: '26200.9168' },
  { build: 26100, version: '24H2', displayName: 'Windows 11, version 24H2', status: 'supported', latestBuild: '26100.9168' },
  { build: 22631, version: '23H2', displayName: 'Windows 11, version 23H2', status: 'edition-dependent', latestBuild: '22631.7517' },
];

export function describeOsVersion(platform: PlatformFamily, rawVersion: string | null): string | null {
  if (!rawVersion) return null;
  if (platform !== 'windows') return rawVersion;

  const parts = rawVersion.trim().split('.');
  const build = Number(parts.length >= 3 ? parts[2] : parts[0]);
  if (!Number.isFinite(build)) return rawVersion;

  const release = windowsReleases.find(item => item.build === build);
  if (!release) return rawVersion;

  return `${release.displayName} · build ${rawVersion}`;
}

export function getWindowsRelease(rawVersion: string | null): WindowsRelease | null {
  if (!rawVersion) return null;
  const parts = rawVersion.trim().split('.');
  const build = Number(parts.length >= 3 ? parts[2] : parts[0]);
  if (!Number.isFinite(build)) return null;
  return windowsReleases.find(item => item.build === build) ?? null;
}
