import type { Device } from './types';

const platformLabel:Record<string,string>={windows:'Windows',android:'Android',ios:'iOS',ipados:'iPadOS',macos:'macOS',linux:'Linux',unknown:'Unknown'};
const fmt=(n:number)=>n.toLocaleString();
const clean=(v:string|null|undefined)=>v?.trim()||'Unknown';
const pct=(n:number,total:number)=>total?`${(n/total*100).toFixed(1)}%`:'0.0%';
const daysSince=(value:string|null)=>{if(!value)return null;const time=Date.parse(value);return Number.isFinite(time)?(Date.now()-time)/(86400000):null};

function countValues(values:string[]){return Object.entries(values.reduce<Record<string,number>>((a,v)=>{a[v]=(a[v]??0)+1;return a},{})).sort((a,b)=>b[1]-a[1])}
function rawValue(device:Device,patterns:RegExp[]){for(const [name,value] of Object.entries(device.raw)){if(patterns.some(p=>p.test(name))&&value?.trim())return value.trim()}return ''}
function hardwareType(device:Device){
  if(device.platform==='ios')return 'Smartphone';
  if(device.platform==='ipados')return 'Tablet';

  const explicit=rawValue(device,[/chassis/i,/form.?factor/i,/device.?type/i,/hardware.?type/i,/device.?category/i]).toLowerCase();
  const model=(device.model||'').toLowerCase();
  const manufacturer=(device.manufacturer||'').toLowerCase();
  const signal=`${explicit} ${model} ${manufacturer}`;

  if(/virtual|vmware|hyper-v|parallels|virtualbox|kvm|virtual machine/.test(signal))return 'Virtual';
  if(/server/.test(signal))return 'Server';

  if(device.platform==='android'){
    if(/tablet|slate|galaxy tab|tab active|sm-[xtp]/.test(signal))return 'Tablet';
    return 'Smartphone';
  }

  if(/tablet|slate|ipad|galaxy tab|surface pro|surface go/.test(signal))return 'Tablet';
  if(/smartphone|phone|handheld/.test(explicit))return 'Smartphone';

  if(/laptop|notebook|portable|macbook|latitude|thinkpad|thinkbook|ideapad|elitebook|probook|zbook|surface laptop|galaxy book/.test(signal))return 'Laptop';
  if(/vostro\s*(3|5|7)\d{3}|dell pro\s*(13|14|16)|precision\s*(3|5|7)\d{3}/.test(model))return 'Laptop';

  if(/desktop|tower|mini pc|optiplex|thinkcentre|prodesk|elitedesk|imac|mac mini|mac studio|surface studio/.test(signal))return 'Desktop';
  if(/dell pro\s*(micro|slim|tower)|qcm\d+|optiplex/.test(model))return 'Desktop';

  return 'Unknown';
}

export default function ExtendedInsights({devices}:{devices:Device[]}){
  const total=devices.length;
  const ownership=countValues(devices.map(d=>clean(d.ownership)));
  const types=countValues(devices.map(hardwareType));
  const manufacturerCounts=countValues(devices.map(d=>clean(d.manufacturer))).filter(([name])=>name!=='Unknown');
  const modelCounts=countValues(devices.map(d=>clean(d.model)).filter(v=>v!=='Unknown'));

  const byPlatform=Object.entries(devices.reduce<Record<string,Device[]>>((a,d)=>{(a[d.platform]??=[]).push(d);return a},{})).sort((a,b)=>b[1].length-a[1].length);
  const fragmentation=byPlatform.map(([platform,list])=>{const versions=countValues(list.map(d=>clean(d.osVersion)));const top=versions[0];return{platform,devices:list.length,versions:versions.length,topVersion:top?.[0]||'Unknown',topCount:top?.[1]||0}});

  const top10=modelCounts.slice(0,10).reduce((s,[,n])=>s+n,0);
  const singletonModels=modelCounts.filter(([,n])=>n===1).length;

  const userCounts=countValues(devices.map(d=>clean(d.userUpn||d.userDisplayName)).filter(v=>v!=='Unknown'));
  const userDistribution=[['1 device',userCounts.filter(([,n])=>n===1).length],['2 devices',userCounts.filter(([,n])=>n===2).length],['3+ devices',userCounts.filter(([,n])=>n>=3).length]] as [string,number][];
  const noUser=devices.filter(d=>!d.userUpn&&!d.userDisplayName).length;

  const serials=devices.map(d=>d.serialNumber?.trim()).filter((v):v is string=>!!v);
  const names=devices.map(d=>d.deviceName?.trim()).filter((v):v is string=>!!v);
  const duplicateSerials=countValues(serials).filter(([,n])=>n>1).reduce((s,[,n])=>s+n,0);
  const duplicateNames=countValues(names).filter(([,n])=>n>1).reduce((s,[,n])=>s+n,0);
  const missingSerial=total-serials.length;
  const unknownPlatform=devices.filter(d=>d.platform==='unknown').length;

  const activity: [string,number][]=[
    ['0–7 days',devices.filter(d=>{const age=daysSince(d.lastCheckIn);return age!==null&&age<=7}).length],
    ['8–30 days',devices.filter(d=>{const age=daysSince(d.lastCheckIn);return age!==null&&age>7&&age<=30}).length],
    ['31–90 days',devices.filter(d=>{const age=daysSince(d.lastCheckIn);return age!==null&&age>30&&age<=90}).length],
    ['>90 days',devices.filter(d=>{const age=daysSince(d.lastCheckIn);return age!==null&&age>90}).length],
    ['Unknown',devices.filter(d=>daysSince(d.lastCheckIn)===null).length]
  ];
  const visibleActivity=activity.filter((row):row is [string,number]=>row[1]>0);

  return <section className="extendedInsightGrid">
    <InsightCard icon="hardware" title="Hardware type" subtitle="Form factor inferred from explicit inventory and trusted model cues">
      <Distribution rows={types} total={total}/><p className="insightFootnote">Unknown is retained only when the available inventory does not provide enough evidence.</p>
    </InsightCard>

    <InsightCard icon="ownership" title="Ownership" subtitle="Corporate, personal and other ownership states">
      <Distribution rows={ownership} total={total}/>
    </InsightCard>

    <InsightCard icon="versions" title="OS fragmentation" subtitle="Version diversity and dominant release per platform">
      <div className="fragmentationList">{fragmentation.map(row=><div key={row.platform}><header><strong>{platformLabel[row.platform]||row.platform}</strong><span>{row.versions} version{row.versions===1?'':'s'}</span></header><div><span className="truncate">{row.topVersion}</span><b>{pct(row.topCount,row.devices)} on top version</b></div><i><b style={{width:pct(row.topCount,row.devices)}}/></i></div>)}</div>
    </InsightCard>

    <InsightCard icon="standardize" title="Hardware standardization" subtitle="How concentrated the fleet is around common models">
      <div className="metricTiles"><Metric label="Unique models" value={fmt(modelCounts.length)}/><Metric label="Top 10 coverage" value={pct(top10,total)}/><Metric label="One-off models" value={fmt(singletonModels)}/></div>
      <div className="miniBars">{modelCounts.slice(0,5).map(([model,n])=><div key={model}><span className="truncate">{model}</span><strong>{fmt(n)}</strong><i><b style={{width:pct(n,modelCounts[0]?.[1]||1)}}/></i></div>)}</div>
    </InsightCard>

    <InsightCard icon="users" title="Devices per user" subtitle="Managed-device density across identified users">
      <div className="metricTiles userTiles">{userDistribution.map(([label,n])=><Metric key={label} label={label} value={fmt(n)}/>)}</div><div className="inlineInsight"><span>No primary user</span><strong>{fmt(noUser)}</strong><small>{pct(noUser,total)} of devices</small></div>
    </InsightCard>

    <InsightCard icon="alert" title="Inventory anomalies" subtitle="Potential duplicates and inconsistent inventory signals">
      <div className="anomalyList"><Anomaly label="Duplicate serial entries" value={duplicateSerials}/><Anomaly label="Duplicate device names" value={duplicateNames}/><Anomaly label="Missing serial number" value={missingSerial}/><Anomaly label="Unknown platform" value={unknownPlatform}/></div>
    </InsightCard>

    <InsightCard icon="activity" title="Activity distribution" subtitle="Recency of the most recent reported Intune check-in">
      <div className="activityBars">{visibleActivity.map(([label,n])=><div key={label}><div><span>{label}</span><strong>{fmt(n)}</strong><small>{pct(n,total)}</small></div><i><b style={{width:pct(n,total)}}/></i></div>)}</div>
    </InsightCard>

    <InsightCard icon="manufacturer" title="Hardware manufacturers" subtitle="Largest hardware vendors in the current view">
      <ManufacturerDistribution rows={manufacturerCounts.slice(0,7)} total={total}/>
    </InsightCard>

    <InsightCard icon="models" title="Hardware models" subtitle="Most common reported models in the current view">
      <Distribution rows={modelCounts.slice(0,7)} total={total}/>
    </InsightCard>
  </section>
}

function InsightCard({icon,title,subtitle,children}:{icon:string;title:string;subtitle:string;children:React.ReactNode}){return <article className={`dashboardCard extendedInsightCard insight-${icon}`}><header className="dashboardCardHead insightCardHead"><span className="cardIcon"><DashboardIcon name={icon}/></span><div><h2>{title}</h2><p>{subtitle}</p></div></header>{children}</article>}
function Distribution({rows,total}:{rows:[string,number][];total:number}){return <div className="distributionList">{rows.filter(([,n])=>n>0).slice(0,7).map(([label,n],i)=><div key={label}><span className={`distributionDot dot${i%6}`}/><span className="truncate" title={label}>{label}</span><strong>{fmt(n)}</strong><small>{pct(n,total)}</small><i><b style={{width:pct(n,total)}}/></i></div>)}</div>}
function ManufacturerDistribution({rows,total}:{rows:[string,number][];total:number}){return <div className="distributionList manufacturerList">{rows.filter(([,n])=>n>0).slice(0,7).map(([label,n],i)=><div key={label}><ManufacturerMark name={label}/><span className="truncate" title={label}>{label}</span><strong>{fmt(n)}</strong><small>{pct(n,total)}</small><i><b style={{width:pct(n,total)}}/></i></div>)}</div>}
function Metric({label,value}:{label:string;value:string}){return <div className="metricTile"><span>{label}</span><strong>{value}</strong></div>}
function Anomaly({label,value}:{label:string;value:number}){return <div className={value?'anomaly hasValue':'anomaly'}><span>{label}</span><strong>{fmt(value)}</strong></div>}

function ManufacturerMark({name}:{name:string}){const n=name.toLowerCase();const key=n.includes('microsoft')?'MS':n.includes('apple')?'A':n.includes('samsung')?'S':n.includes('lenovo')?'L':n.includes('dell')?'D':n==='hp'||n.includes('hewlett')?'hp':n.includes('logitech')?'G':name.slice(0,2).toUpperCase();return <span className={`manufacturerMark manufacturer-${key.toLowerCase()}`} aria-hidden="true">{key}</span>}

function DashboardIcon({name}:{name:string}){switch(name){
  case'hardware':return <svg viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="11" rx="2"/><path d="M8 20h8M10 16v4m4-4v4"/></svg>;
  case'ownership':return <svg viewBox="0 0 24 24"><path d="M12 3 4.5 6v5.5c0 4.7 3.1 7.7 7.5 9.5 4.4-1.8 7.5-4.8 7.5-9.5V6L12 3Z"/><path d="m8.7 12 2.1 2.1 4.7-5"/></svg>;
  case'versions':return <svg viewBox="0 0 24 24"><path d="M5 6h14M5 12h10M5 18h6"/><circle cx="18" cy="12" r="2"/><circle cx="14" cy="18" r="2"/></svg>;
  case'standardize':return <svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>;
  case'users':return <svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3.5 19c.5-3.7 2.4-5.5 5.5-5.5s5 1.8 5.5 5.5"/><circle cx="17" cy="9" r="2.2"/><path d="M15.5 14.5c2.9-.4 4.6 1.1 5 4.5"/></svg>;
  case'alert':return <svg viewBox="0 0 24 24"><path d="M12 3.5 21 20H3L12 3.5Z"/><path d="M12 9v5m0 3h.01"/></svg>;
  case'activity':return <svg viewBox="0 0 24 24"><path d="M3 12h4l2-5 4 10 2-5h6"/></svg>;
  case'manufacturer':return <svg viewBox="0 0 24 24"><path d="M4 20V8l8-4v16M12 9l8-3v14M7 11h2m-2 4h2m6-3h2m-2 4h2"/></svg>;
  default:return <svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="16" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>;
}}
