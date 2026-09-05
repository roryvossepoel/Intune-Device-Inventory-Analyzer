import { getWindowsIntelligence } from './deviceIntelligence';
import type { Device } from './types';

export type LifecycleRiskSummary={
  risk:number;
  assessed:number;
  expired:number;
  nearEnd:number;
  staleAndroidPatch:number;
};

const DAY=86400000;

// Apple does not publish fixed end-of-support dates for iOS/iPadOS or macOS.
// These sets represent OS branches for which Apple is still publishing security updates.
// Source reviewed 2026-09-05: Apple security releases.
const SUPPORTED_IOS_IPADOS_MAJORS=new Set([26,18,17,16,15]);
const KNOWN_IOS_IPADOS_MAJORS=new Set([26,18,17,16,15,14,13,12,11,10,9]);
const SUPPORTED_MACOS_MAJORS=new Set([26,15,14]);
const KNOWN_MACOS_MAJORS=new Set([26,15,14,13,12,11,10]);

// Ubuntu is the only Linux distribution for which the Analyzer currently
// evaluates lifecycle. Dates are end of standard security maintenance.
// Source reviewed 2026-09-05: Canonical Ubuntu release cycle.
const UBUNTU_STANDARD_SUPPORT_END:Record<string,string>={
  '26.04':'2031-05-31',
  '24.04':'2029-05-31',
  '22.04':'2027-05-31',
  '20.04':'2025-05-31',
  '18.04':'2023-05-31',
  '16.04':'2021-04-30',
  '14.04':'2019-04-30'
};

function platformKey(value:string){return value==='ios'||value==='ipados'?'applemobile':value}
function rawValue(device:Device,pattern:RegExp){return Object.entries(device.raw).find(([name])=>pattern.test(name))?.[1]?.trim()||''}
function skuFamily(device:Device){return rawValue(device,/^SkuFamily$|^OS SKU$|^SKU$/i).toLowerCase()}
function reportedVersion(device:Device){return rawValue(device,/^OS version$/i)||device.osVersion||''}
function majorVersion(value:string){const match=value.match(/(?:^|\s)(\d{1,2})(?:\.|\s|$)/);return match?Number(match[1]):null}

function windowsEndDate(device:Device){
  const release=getWindowsIntelligence(device.osVersion)?.release;
  if(!release)return null;
  const sku=skuFamily(device);
  const homePro=/home|pro|professional/.test(sku)&&!/enterprise|education/.test(sku);
  const enterpriseEducation=/enterprise|education/.test(sku);
  const value=homePro
    ?release.endOfUpdatesHomePro
    :enterpriseEducation
      ?release.endOfUpdatesEnterpriseEducation
      :[release.endOfUpdatesHomePro,release.endOfUpdatesEnterpriseEducation].sort()[0];
  const time=Date.parse(`${value}T23:59:59`);
  return Number.isFinite(time)?time:null;
}

function appleSupportState(device:Device,platform:'applemobile'|'macos'):'supported'|'unsupported'|'unknown'{
  const major=majorVersion(reportedVersion(device));
  if(major===null)return 'unknown';
  if(platform==='applemobile'){
    if(SUPPORTED_IOS_IPADOS_MAJORS.has(major))return 'supported';
    return KNOWN_IOS_IPADOS_MAJORS.has(major)?'unsupported':'unknown';
  }
  if(SUPPORTED_MACOS_MAJORS.has(major))return 'supported';
  return KNOWN_MACOS_MAJORS.has(major)?'unsupported':'unknown';
}

function ubuntuEndDate(device:Device){
  const value=`${device.sourceOS||''} ${reportedVersion(device)}`;
  if(!/ubuntu/i.test(value))return null;
  const match=value.match(/\b(\d{2}\.\d{2})\b/);
  if(!match)return null;
  const end=UBUNTU_STANDARD_SUPPORT_END[match[1]];
  if(!end)return null;
  const time=Date.parse(`${end}T23:59:59`);
  return Number.isFinite(time)?time:null;
}

export function lifecycleRiskSummary(devices:Device[]):LifecycleRiskSummary{
  const now=Date.now();
  const sixMonths=new Date();
  sixMonths.setMonth(sixMonths.getMonth()+6);
  const sixMonthCutoff=sixMonths.getTime();
  let risk=0,assessed=0,expired=0,nearEnd=0,staleAndroidPatch=0;

  for(const device of devices){
    const platform=platformKey(device.platform);

    if(platform==='windows'){
      const end=windowsEndDate(device);
      if(end===null)continue;
      assessed++;
      if(end<now){risk++;expired++;continue}
      if(end<=sixMonthCutoff){risk++;nearEnd++}
      continue;
    }

    if(platform==='android'){
      const patch=rawValue(device,/^Security patch level$/i);
      const patchTime=patch?Date.parse(patch):Number.NaN;
      if(!Number.isFinite(patchTime))continue;
      assessed++;
      if(now-patchTime>90*DAY){risk++;staleAndroidPatch++}
      continue;
    }

    if(platform==='applemobile'||platform==='macos'){
      const state=appleSupportState(device,platform);
      if(state==='unknown')continue;
      assessed++;
      if(state==='unsupported'){risk++;expired++}
      continue;
    }

    if(platform==='linux'){
      const end=ubuntuEndDate(device);
      if(end===null)continue;
      assessed++;
      if(end<now){risk++;expired++;continue}
      if(end<=sixMonthCutoff){risk++;nearEnd++}
    }
  }

  return {risk,assessed,expired,nearEnd,staleAndroidPatch};
}
