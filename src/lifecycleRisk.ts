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

function platformKey(value:string){return value==='ios'||value==='ipados'?'applemobile':value}
function rawValue(device:Device,pattern:RegExp){return Object.entries(device.raw).find(([name])=>pattern.test(name))?.[1]?.trim()||''}
function skuFamily(device:Device){return rawValue(device,/^SkuFamily$|^OS SKU$|^SKU$/i).toLowerCase()}

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
    }
  }

  return {risk,assessed,expired,nearEnd,staleAndroidPatch};
}
