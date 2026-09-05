import { getWindowsIntelligence } from './deviceIntelligence';
import type { Device } from './types';

type LifecycleTone='healthy'|'warning'|'expired'|'unknown';
type LifecycleRow={
  key:string;
  label:string;
  build:number|null;
  devices:number;
  endDate:string|null;
  mixedEditions:boolean;
  remaining:string;
  percentage:number;
  tone:LifecycleTone;
};

const formatCount=(value:number)=>value.toLocaleString();
const formatPercentage=(value:number)=>new Intl.NumberFormat(undefined,{style:'percent',minimumFractionDigits:1,maximumFractionDigits:1}).format(value);

function rawValue(device:Device,pattern:RegExp){return Object.entries(device.raw).find(([name])=>pattern.test(name))?.[1]?.trim()||''}
function skuFamily(device:Device){return rawValue(device,/^SkuFamily$|^OS SKU$|^SKU$/i).toLowerCase()}
function usesHomeProLifecycle(device:Device){const sku=skuFamily(device);if(!sku)return false;if(/enterprise|education/.test(sku))return false;return /home|pro|professional/.test(sku)}
function parseDateOnly(value:string){const [year,month,day]=value.split('-').map(Number);if(!year||!month||!day)return null;return new Date(year,month-1,day,12,0,0,0)}
function formatDate(value:string|null){if(!value)return 'Unknown';const date=parseDateOnly(value);if(!date)return value;return new Intl.DateTimeFormat(undefined,{year:'numeric',month:'short',day:'numeric'}).format(date)}
function wholeMonthsRemaining(value:string|null){if(!value)return null;const end=parseDateOnly(value);if(!end)return null;const now=new Date();if(end.getTime()<now.getTime())return -1;let months=(end.getFullYear()-now.getFullYear())*12+(end.getMonth()-now.getMonth());if(end.getDate()<now.getDate())months-=1;return Math.max(0,months)}
function describeRemaining(value:string|null){const months=wholeMonthsRemaining(value);if(months===null)return 'Unknown';if(months<0)return 'Expired';if(months===0)return '< 1 month';if(months<12)return `${months} month${months===1?'':'s'}`;const years=Math.floor(months/12),rest=months%12;if(!rest)return `${years} year${years===1?'':'s'}`;return `${years} year${years===1?'':'s'} ${rest} month${rest===1?'':'s'}`}
function toneFor(value:string|null):LifecycleTone{const months=wholeMonthsRemaining(value);if(months===null)return 'unknown';if(months<0)return 'expired';if(months<6)return 'warning';return 'healthy'}

function lifecycleRows(devices:Device[]):LifecycleRow[]{
  const grouped=new Map<string,{label:string;build:number;devices:Device[];homePro:string;enterpriseEducation:string}>();
  let unknown=0;
  for(const device of devices){
    const release=getWindowsIntelligence(device.osVersion)?.release;
    if(!release){unknown++;continue}
    const id=`${release.product}|${release.version}`;
    const group=grouped.get(id)??{label:`${release.product} ${release.version}`,build:release.build,devices:[],homePro:release.endOfUpdatesHomePro,enterpriseEducation:release.endOfUpdatesEnterpriseEducation};
    group.devices.push(device);grouped.set(id,group);
  }
  const total=devices.length;
  const rows:LifecycleRow[]=[...grouped.entries()].map(([key,group])=>{
    const applicable=[...new Set(group.devices.map(device=>usesHomeProLifecycle(device)?group.homePro:group.enterpriseEducation))].sort();
    const endDate=applicable[0]??null;
    return {key,label:group.label,build:group.build,devices:group.devices.length,endDate,mixedEditions:applicable.length>1,remaining:describeRemaining(endDate),percentage:total?group.devices.length/total:0,tone:toneFor(endDate)};
  }).sort((a,b)=>{
    if(!a.endDate&&!b.endDate)return (a.build??0)-(b.build??0);
    if(!a.endDate)return 1;
    if(!b.endDate)return -1;
    return Date.parse(a.endDate)-Date.parse(b.endDate);
  });
  if(unknown)rows.push({key:'unknown',label:'Unmapped Windows version',build:null,devices:unknown,endDate:null,mixedEditions:false,remaining:'Unknown',percentage:total?unknown/total:0,tone:'unknown'});
  return rows;
}

export default function WindowsLifecycle({devices,title='Release lifecycle'}:{devices:Device[];title?:string}){
  const rows=lifecycleRows(devices);
  if(!devices.length||!rows.length)return null;
  return <article className="dashboardCard windowsLifecycleCard">
    <header className="dashboardCardHead windowsLifecycleHead"><div className="windowsLifecycleTitle"><span className="windowsLifecycleLogo" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 5.5 10.5 4v7H3V5.5Zm8.5-1.7L21 2v9h-9.5V3.8ZM3 12h7.5v8L3 18.5V12Zm8.5 0H21v10l-9.5-1.8V12Z"/></svg></span><div><h2>{title}</h2><p>Support lifecycle of Windows releases in the current inventory.</p></div></div><span>{rows.length} release{rows.length===1?'':'s'}</span></header>
    <div className="windowsLifecycleTableWrap"><table className="windowsLifecycleTable"><thead><tr><th>Windows version</th><th>Devices</th><th>End of support</th><th>Support remaining</th><th>Percentage</th></tr></thead><tbody>{rows.map(row=><tr key={row.key} className={`windowsLifecycleRow ${row.tone}`}><td><strong>{row.label}</strong></td><td>{formatCount(row.devices)}</td><td title={row.mixedEditions?'Multiple Windows edition families are present. The earliest applicable support date is shown.':undefined}>{formatDate(row.endDate)}</td><td>{row.remaining}</td><td>{formatPercentage(row.percentage)}</td></tr>)}</tbody></table></div>
  </article>;
}
