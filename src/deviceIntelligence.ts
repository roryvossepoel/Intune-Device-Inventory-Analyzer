import type { PlatformFamily } from './types';
import windowsData from './generated/windows-builds.json';

export type WindowsRelease = {
  product: string;
  version: string;
  displayName: string;
  build: number;
  availabilityDate: string;
  endOfUpdatesHomePro: string;
  endOfUpdatesEnterpriseEducation: string;
  latestBuild: string;
  latestHotpatchBuild?: string;
  status: 'supported' | 'edition-dependent';
  deployment: string;
};

export type WindowsUpdateHealth = 'current' | 'behind' | 'edition-review' | 'unknown';
export type WindowsIntelligence = {
  rawVersion: string;
  release: WindowsRelease | null;
  releaseName: string;
  build: number | null;
  revision: number | null;
  latestBuild: string | null;
  updateHealth: WindowsUpdateHealth;
  servicing: 'supported' | 'edition-dependent' | 'unknown';
};

export type IntelligencePlatform = PlatformFamily | 'applemobile';

const windowsReleases = windowsData.records as WindowsRelease[];

function parseBuild(version:string){
  const match=version.match(/(?:^|build\s+)(?:10\.0\.)?(\d{5})(?:\.(\d+))?/i) || version.match(/10\.0\.(\d{5})\.(\d+)/);
  if(!match) return {build:null,revision:null};
  return {build:Number(match[1]),revision:match[2]?Number(match[2]):null};
}

function revisionOf(version:string|undefined){
  if(!version)return null;
  const parts=version.split('.');
  const value=Number(parts[parts.length-1]);
  return Number.isFinite(value)?value:null;
}

export function getWindowsIntelligence(version:string|null):WindowsIntelligence|null{
  if(!version)return null;
  const {build,revision}=parseBuild(version);
  if(!build) return {rawVersion:version,release:null,releaseName:version,build:null,revision:null,latestBuild:null,updateHealth:'unknown',servicing:'unknown'};
  const release=windowsReleases.find(r=>r.build===build)??null;
  if(!release) return {rawVersion:version,release:null,releaseName:version,build,revision,latestBuild:null,updateHealth:'unknown',servicing:'unknown'};
  const currentRevisions=[revisionOf(release.latestBuild),revisionOf(release.latestHotpatchBuild)].filter((n):n is number=>n!==null);
  let updateHealth:WindowsUpdateHealth='unknown';
  if(release.status==='edition-dependent') updateHealth='edition-review';
  else if(revision!==null && currentRevisions.includes(revision)) updateHealth='current';
  else if(revision!==null && currentRevisions.length && revision < Math.max(...currentRevisions)) updateHealth='behind';
  return {rawVersion:version,release,releaseName:release.displayName,build,revision,latestBuild:release.latestBuild,updateHealth,servicing:release.status};
}

export function describeOsVersion(platform:IntelligencePlatform,rawVersion:string|null):string|null{
  if(!rawVersion)return null;
  const value=rawVersion.trim();
  if(platform==='windows'){
    // Device data may already have been enriched (for example demo or cached data).
    // Keep an already formatted Windows release/build label intact instead of
    // prepending the marketing name a second time.
    if(/^Windows\s+\d+/i.test(value) && /(?:·\s*)?build\s+/i.test(value))return value;
    const info=getWindowsIntelligence(value);
    return info?.release ? `${info.release.displayName} · build ${value}` : value;
  }
  if(platform==='applemobile'||platform==='ios'||platform==='ipados')return /^iOS\/iPadOS\s/i.test(value)?value:`iOS/iPadOS ${value}`;
  if(platform==='macos')return /^macOS\s/i.test(value)?value:`macOS ${value}`;
  if(platform==='android')return /^Android\s/i.test(value)?value:`Android ${value}`;
  if(platform==='linux')return /^Linux\s/i.test(value)?value:`Linux ${value}`;
  return value;
}

export function getWindowsRelease(version:string|null):WindowsRelease|null{
  return getWindowsIntelligence(version)?.release??null;
}
