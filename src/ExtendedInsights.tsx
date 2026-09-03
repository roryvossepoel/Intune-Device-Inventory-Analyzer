import type { Device } from './types';

const platformLabel:Record<string,string>={windows:'Windows',android:'Android',ios:'iOS',ipados:'iPadOS',applemobile:'Apple Mobile',iosipados:'iOS/iPadOS',macos:'macOS',linux:'Linux',unknown:'Unknown'};
const fmt=(n:number)=>n.toLocaleString();
const clean=(v:string|null|undefined)=>v?.trim()||'Unknown';
const pct=(n:number,total:number)=>total?`${(n/total*100).toFixed(1)}%`:'0.0%';
const daysSince=(value:string|null)=>{if(!value)return null;const time=Date.parse(value);return Number.isFinite(time)?(Date.now()-time)/86400000:null};
function countValues(values:string[]){return Object.entries(values.reduce<Record<string,number>>((a,v)=>{a[v]=(a[v]??0)+1;return a},{})).sort((a,b)=>b[1]-a[1])}
function rawValue(device:Device,patterns:RegExp[]){for(const [name,value] of Object.entries(device.raw)){if(patterns.some(p=>p.test(name))&&value?.trim())return value.trim()}return ''}
function osFamily(platform:string){return platform==='ios'||platform==='ipados'?'iosipados':platform}
function platformFamily(platform:string){return platform==='ios'||platform==='ipados'?'applemobile':platform}

function hardwareType(device:Device){
  if(device.platform==='ios')return 'Smartphone';
  if(device.platform==='ipados')return 'Tablet';
  const explicit=rawValue(device,[/chassis/i,/form.?factor/i,/device.?type/i,/hardware.?type/i,/device.?category/i]).toLowerCase();
  const model=(device.model||'').toLowerCase();
  const manufacturer=(device.manufacturer||'').toLowerCase();
  const signal=`${explicit} ${model} ${manufacturer}`;
  if(/virtual|vmware|hyper-v|parallels|virtualbox|kvm|virtual machine|virtual desktop|horizon|avd/.test(signal))return 'Virtual';
  if(/server/.test(signal))return 'Server';
  if(device.platform==='android'){if(/tablet|slate|galaxy tab|tab active|pixel tablet|sm-[xtp]/.test(signal))return 'Tablet';return 'Smartphone'}
  if(device.platform==='macos'){if(/macbook/.test(signal))return 'Laptop';if(/imac|mac mini|mac studio|mac pro/.test(signal))return 'Desktop'}
  if(/tablet|slate|ipad|galaxy tab|surface pro|surface go|latitude 7\d{3} 2-in-1/.test(signal))return 'Tablet';
  if(/smartphone|phone|handheld/.test(explicit))return 'Smartphone';
  if(/laptop|notebook|portable|mobile workstation|macbook|latitude|thinkpad|thinkbook|ideapad|elitebook|probook|zbook|surface laptop|galaxy book|travelmate|lifebook|dynabook/.test(signal))return 'Laptop';
  if(/vostro\s*(3|5|7)\d{3}|dell pro\s*(13|14|16)|precision\s*(3|5|7)\d{3}|precision\s*\d{4}|probook\s*\d|elitebook\s*\d|zbook/.test(model))return 'Laptop';
  if(/desktop|tower|mini pc|micro pc|small form factor|sff|optiplex|thinkcentre|prodesk|elitedesk|imac|mac mini|mac studio|mac pro|surface studio|workstation/.test(signal))return 'Desktop';
  if(/dell pro\s*(micro|slim|tower)|qcm\d+|optiplex|precision\s*(tower|rack)/.test(model))return 'Desktop';
  return 'Unknown';
}

export default function ExtendedInsights({devices}:{devices:Device[]}){
  const total=devices.length;
  const ownership=countValues(devices.map(d=>clean(d.ownership)));
  const types=countValues(devices.map(hardwareType));
  const manufacturerCounts=countValues(devices.map(d=>clean(d.manufacturer))).filter(([n])=>n!=='Unknown');
  const modelCounts=countValues(devices.map(d=>clean(d.model)).filter(v=>v!=='Unknown'));
  const platformCounts=countValues(devices.map(d=>platformFamily(d.platform))).filter(([n])=>n!=='unknown');
  const byPlatform=Object.entries(devices.reduce<Record<string,Device[]>>((a,d)=>{const family=osFamily(d.platform);(a[family]??=[]).push(d);return a},{})).sort((a,b)=>b[1].length-a[1].length);
  const fragmentation=byPlatform.map(([platform,list])=>{const versions=countValues(list.map(d=>clean(d.osVersion))),top=versions[0];return{platform,devices:list.length,versions:versions.length,topVersion:top?.[0]||'Unknown',topCount:top?.[1]||0}});
  const userCounts=countValues(devices.map(d=>clean(d.userUpn||d.userDisplayName)).filter(v=>v!=='Unknown'));
  const userDistribution=[['1 device',userCounts.filter(([,n])=>n===1).length],['2 devices',userCounts.filter(([,n])=>n===2).length],['3+ devices',userCounts.filter(([,n])=>n>=3).length]] as [string,number][];
  const noUser=devices.filter(d=>!d.userUpn&&!d.userDisplayName).length;
  const serials=devices.map(d=>d.serialNumber?.trim()).filter((v):v is string=>!!v);
  const names=devices.map(d=>d.deviceName?.trim()).filter((v):v is string=>!!v);
  const duplicateSerials=countValues(serials).filter(([,n])=>n>1).reduce((s,[,n])=>s+n,0);
  const duplicateNames=countValues(names).filter(([,n])=>n>1).reduce((s,[,n])=>s+n,0);
  const missingSerial=total-serials.length;
  const unknownPlatform=devices.filter(d=>d.platform==='unknown').length;
  const activity:[string,number][]=[
    ['0–7 days',devices.filter(d=>{const a=daysSince(d.lastCheckIn);return a!==null&&a<=7}).length],
    ['8–30 days',devices.filter(d=>{const a=daysSince(d.lastCheckIn);return a!==null&&a>7&&a<=30}).length],
    ['31–90 days',devices.filter(d=>{const a=daysSince(d.lastCheckIn);return a!==null&&a>30&&a<=90}).length],
    ['>90 days',devices.filter(d=>{const a=daysSince(d.lastCheckIn);return a!==null&&a>90}).length],
    ['Unknown',devices.filter(d=>daysSince(d.lastCheckIn)===null).length]
  ];
  const visibleActivity=activity.filter((r):r is [string,number]=>r[1]>0);

  return <section className="insightCategoryStack">
    <div className="extendedInsightGrid hardwareInsightGrid">
      <InsightCard icon="hardware" title="Hardware type" subtitle="Form factor inferred from inventory and trusted model families"><Distribution rows={types} total={total} icons="hardware"/><p className="insightFootnote">Unknown means the export and current model rules do not provide enough evidence.</p></InsightCard>
      <InsightCard icon="manufacturer" title="Hardware manufacturers" subtitle="Largest hardware vendors in the current view"><ManufacturerDistribution rows={manufacturerCounts.slice(0,7)} total={total}/></InsightCard>
      <InsightCard icon="models" title="Hardware models" subtitle="Most common reported models in the current view"><Distribution rows={modelCounts.slice(0,7)} total={total}/></InsightCard>
    </div>

    <InsightCategory title="Operating systems" subtitle="Platform mix, OS families, version diversity and dominant releases.">
      <div className="extendedInsightGrid twoInsightGrid operatingSystemsGrid">
        <InsightCard icon="platforms" title="Platform distribution" subtitle="Device mix across the current inventory view"><PlatformDistribution rows={platformCounts} total={total}/></InsightCard>
        <InsightCard icon="versions" title="OS fragmentation" subtitle="Version diversity and dominant release per OS family"><div className="fragmentationList">{fragmentation.map(row=><div key={row.platform}><header><span className="labelWithIcon"><PlatformIcon name={row.platform}/><strong>{platformLabel[row.platform]||row.platform}</strong></span><span>{row.versions} version{row.versions===1?'':'s'}</span></header><div><span className="truncate">{row.topVersion}</span><b>{pct(row.topCount,row.devices)} on top version</b></div><i><b style={{width:pct(row.topCount,row.devices)}}/></i></div>)}</div></InsightCard>
      </div>
    </InsightCategory>

    <InsightCategory title="Users & ownership" subtitle="Primary-user coverage, device density and ownership state.">
      <div className="extendedInsightGrid twoInsightGrid">
        <InsightCard icon="users" title="Devices per user" subtitle="Managed-device density across identified users"><div className="metricTiles userTiles">{userDistribution.map(([label,n])=><Metric key={label} label={label} value={fmt(n)}/>)}</div><div className="inlineInsight"><span>No primary user</span><strong>{fmt(noUser)}</strong><small>{pct(noUser,total)} of devices</small></div></InsightCard>
        <InsightCard icon="ownership" title="Ownership" subtitle="Corporate, personal and other ownership states"><Distribution rows={ownership} total={total} icons="ownership"/></InsightCard>
      </div>
    </InsightCategory>

    <InsightCategory title="Inventory & activity" subtitle="Inventory quality signals and recent device activity.">
      <div className="extendedInsightGrid twoInsightGrid">
        <InsightCard icon="activity" title="Activity distribution" subtitle="Recency of the most recent reported Intune check-in"><div className="activityBars">{visibleActivity.map(([label,n])=><div key={label}><div><span>{label}</span><strong>{fmt(n)}</strong><small>{pct(n,total)}</small></div><i><b style={{width:pct(n,total)}}/></i></div>)}</div></InsightCard>
        <InsightCard icon="alert" title="Inventory anomalies" subtitle="Potential duplicates and inconsistent inventory signals"><div className="anomalyList"><Anomaly label="Duplicate serial entries" value={duplicateSerials}/><Anomaly label="Duplicate device names" value={duplicateNames}/><Anomaly label="Missing serial number" value={missingSerial}/><Anomaly label="Unknown platform" value={unknownPlatform}/></div></InsightCard>
      </div>
    </InsightCategory>
  </section>
}

function InsightCategory({title,subtitle,children}:{title:string;subtitle:string;children:React.ReactNode}){return <section className="insightCategory"><header className="insightCategoryHead"><div><h3>{title}</h3><p>{subtitle}</p></div></header>{children}</section>}
function InsightCard({icon,title,subtitle,children}:{icon:string;title:string;subtitle:string;children:React.ReactNode}){return <article className={`dashboardCard extendedInsightCard insight-${icon}`}><header className="dashboardCardHead insightCardHead"><span className="cardIcon"><DashboardIcon name={icon}/></span><div><h2>{title}</h2><p>{subtitle}</p></div></header>{children}</article>}
function PlatformDistribution({rows,total}:{rows:[string,number][];total:number}){let cursor=0;const stops=rows.map(([,n],i)=>{const start=cursor;cursor+=total?n/total*100:0;return `var(--chart-${i%6}) ${start}% ${cursor}%`});return <div className="platformDistributionBody"><div className="platformDistributionDonut" style={{background:`conic-gradient(${stops.join(',')||'#e7eef7 0 100%'})`}}><div><strong>{fmt(total)}</strong><span>devices</span></div></div><div className="platformDistributionLegend">{rows.map(([name,n],i)=><div key={name}><span className={`distributionDot dot${i%6}`}/><span>{platformLabel[name]||name}</span><strong>{fmt(n)}</strong><small>{pct(n,total)}</small></div>)}</div></div>}
function Distribution({rows,total,icons}:{rows:[string,number][];total:number;icons?:'hardware'|'ownership'}){return <div className="distributionList">{rows.filter(([,n])=>n>0).slice(0,7).map(([label,n],i)=><div key={label}>{icons?<MiniIcon kind={icons} label={label}/>:<span className={`distributionDot dot${i%6}`}/>}<span className="truncate" title={label}>{label}</span><strong>{fmt(n)}</strong><small>{pct(n,total)}</small><i><b style={{width:pct(n,total)}}/></i></div>)}</div>}
function ManufacturerDistribution({rows,total}:{rows:[string,number][];total:number}){return <div className="distributionList manufacturerList">{rows.filter(([,n])=>n>0).slice(0,7).map(([label,n])=><div key={label}><ManufacturerMark name={label}/><span className="truncate" title={label}>{label}</span><strong>{fmt(n)}</strong><small>{pct(n,total)}</small><i><b style={{width:pct(n,total)}}/></i></div>)}</div>}
function Metric({label,value}:{label:string;value:string}){return <div className="metricTile"><span>{label}</span><strong>{value}</strong></div>}
function Anomaly({label,value}:{label:string;value:number}){return <div className={value?'anomaly hasValue':'anomaly'}><span>{label}</span><strong>{fmt(value)}</strong></div>}
function ManufacturerMark({name}:{name:string}){const n=name.toLowerCase(),key=n.includes('microsoft')?'MS':n.includes('apple')?'A':n.includes('samsung')?'S':n.includes('lenovo')?'L':n.includes('dell')?'D':n==='hp'||n.includes('hewlett')?'hp':n.includes('google')?'G':n.includes('motorola')?'M':n.includes('xiaomi')?'X':name.slice(0,2).toUpperCase();return <span className={`manufacturerMark manufacturer-${key.toLowerCase()}`} aria-hidden="true">{key}</span>}
function MiniIcon({kind,label}:{kind:'hardware'|'ownership';label:string}){const l=label.toLowerCase();const name=kind==='ownership'?'shield':l.includes('laptop')?'laptop':l.includes('desktop')?'desktop':l.includes('tablet')?'tablet':l.includes('smartphone')?'phone':l.includes('virtual')?'virtual':l.includes('server')?'server':'unknown';return <span className="miniDataIcon"><SimpleIcon name={name}/></span>}
function PlatformIcon({name}:{name:string}){return <span className={`platformMiniIcon platform-${name}`}><SimpleIcon name={name}/></span>}
function SimpleIcon({name}:{name:string}){if(name==='windows')return <svg viewBox="0 0 24 24"><path d="M3 5.5 10.5 4v7H3V5.5Zm8.5-1.7L21 2v9h-9.5V3.8ZM3 12h7.5v8L3 18.5V12Zm8.5 0H21v10l-9.5-1.8V12Z" fill="currentColor" stroke="none"/></svg>;if(name==='android')return <svg viewBox="0 0 24 24"><path d="M7 9h10v8H7V9Zm2-3-1.5-2M15 6l1.5-2M5 10v5m14-5v5M9 17v3m6-3v3"/></svg>;if(name==='iosipados'||name==='applemobile'||name==='ipados'||name==='tablet')return <svg viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M11 18h2"/></svg>;if(name==='phone')return <svg viewBox="0 0 24 24"><rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18.5h2"/></svg>;if(name==='laptop')return <svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="11" rx="1.5"/><path d="M3 19h18l-2-4H5l-2 4Z"/></svg>;if(name==='desktop')return <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M9 20h6m-3-4v4"/></svg>;if(name==='virtual')return <svg viewBox="0 0 24 24"><rect x="3" y="4" width="13" height="10" rx="1.5"/><rect x="8" y="10" width="13" height="10" rx="1.5"/></svg>;if(name==='server')return <svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="7" rx="1.5"/><rect x="4" y="14" width="16" height="7" rx="1.5"/><path d="M7 6.5h.01M7 17.5h.01M10 6.5h7M10 17.5h7"/></svg>;if(name==='shield')return <svg viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 4.5 2.9 7.3 7 9 4.1-1.7 7-4.5 7-9V6l-7-3Z"/></svg>;return <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M10 9a2.3 2.3 0 1 1 3.8 1.8c-1 .8-1.8 1.3-1.8 2.7M12 17h.01"/></svg>}
function DashboardIcon({name}:{name:string}){switch(name){case'hardware':return <SimpleIcon name="desktop"/>;case'ownership':return <SimpleIcon name="shield"/>;case'platforms':return <svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>;case'versions':return <svg viewBox="0 0 24 24"><path d="M5 6h14M5 12h10M5 18h6"/><circle cx="18" cy="12" r="2"/><circle cx="14" cy="18" r="2"/></svg>;case'users':return <svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3.5 19c.5-3.7 2.4-5.5 5.5-5.5s5 1.8 5.5 5.5"/><circle cx="17" cy="9" r="2.2"/><path d="M15.5 14.5c2.9-.4 4.6 1.1 5 4.5"/></svg>;case'alert':return <svg viewBox="0 0 24 24"><path d="M12 3.5 21 20H3L12 3.5Z"/><path d="M12 9v5m0 3h.01"/></svg>;case'activity':return <svg viewBox="0 0 24 24"><path d="M3 12h4l2-5 4 10 2-5h6"/></svg>;case'manufacturer':return <svg viewBox="0 0 24 24"><path d="M4 20V8l8-4v16M12 9l8-3v14M7 11h2m-2 4h2m6-3h2m-2 4h2"/></svg>;default:return <svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>}}
