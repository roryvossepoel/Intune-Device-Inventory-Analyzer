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
  if(/virtual|vmware|hyper-v|parallels|virtualbox|kvm/.test(signal))return 'Virtual';
  if(/server/.test(signal))return 'Server';
  if(/tablet|slate|ipad|galaxy tab|surface pro/.test(signal))return 'Tablet';
  if(/smartphone|phone|handheld/.test(explicit))return 'Smartphone';
  if(/laptop|notebook|portable|macbook|latitude|thinkpad|elitebook|probook|surface laptop/.test(signal))return 'Laptop';
  if(/desktop|tower|mini pc|optiplex|thinkcentre|prodesk|elitedesk|imac|mac mini|mac studio/.test(signal))return 'Desktop';
  return 'Unknown';
}

export default function ExtendedInsights({devices}:{devices:Device[]}){
  const total=devices.length;
  const ownership=countValues(devices.map(d=>clean(d.ownership)));
  const management=countValues(devices.map(d=>clean(d.managedBy)));
  const types=countValues(devices.map(hardwareType));

  const byPlatform=Object.entries(devices.reduce<Record<string,Device[]>>((a,d)=>{(a[d.platform]??=[]).push(d);return a},{})).sort((a,b)=>b[1].length-a[1].length);
  const fragmentation=byPlatform.map(([platform,list])=>{const versions=countValues(list.map(d=>clean(d.osVersion)));const top=versions[0];return{platform,devices:list.length,versions:versions.length,topVersion:top?.[0]||'Unknown',topCount:top?.[1]||0}});

  const modelCounts=countValues(devices.map(d=>clean(d.model)).filter(v=>v!=='Unknown'));
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

  const activity=[
    ['0–7 days',devices.filter(d=>{const age=daysSince(d.lastCheckIn);return age!==null&&age<=7}).length],
    ['8–30 days',devices.filter(d=>{const age=daysSince(d.lastCheckIn);return age!==null&&age>7&&age<=30}).length],
    ['31–90 days',devices.filter(d=>{const age=daysSince(d.lastCheckIn);return age!==null&&age>30&&age<=90}).length],
    ['>90 days',devices.filter(d=>{const age=daysSince(d.lastCheckIn);return age!==null&&age>90}).length],
    ['Unknown',devices.filter(d=>daysSince(d.lastCheckIn)===null).length]
  ] as [string,number][];

  return <section className="extendedInsightGrid">
    <InsightCard title="Hardware type" subtitle="Form factor inferred from explicit inventory and trusted model cues">
      <Distribution rows={types} total={total}/><p className="insightFootnote">Unknown is retained when the export does not provide enough evidence.</p>
    </InsightCard>

    <InsightCard title="Ownership" subtitle="Corporate, personal and other ownership states">
      <Distribution rows={ownership} total={total}/>
    </InsightCard>

    <InsightCard title="Management authority" subtitle="How devices report their management source">
      <Distribution rows={management} total={total}/>
    </InsightCard>

    <InsightCard title="OS fragmentation" subtitle="Version diversity and dominant release per platform">
      <div className="fragmentationList">{fragmentation.map(row=><div key={row.platform}><header><strong>{platformLabel[row.platform]||row.platform}</strong><span>{row.versions} version{row.versions===1?'':'s'}</span></header><div><span className="truncate">{row.topVersion}</span><b>{pct(row.topCount,row.devices)} on top version</b></div><i><b style={{width:pct(row.topCount,row.devices)}}/></i></div>)}</div>
    </InsightCard>

    <InsightCard title="Hardware standardization" subtitle="How concentrated the fleet is around common models">
      <div className="metricTiles"><Metric label="Unique models" value={fmt(modelCounts.length)}/><Metric label="Top 10 coverage" value={pct(top10,total)}/><Metric label="One-off models" value={fmt(singletonModels)}/></div>
      <div className="miniBars">{modelCounts.slice(0,5).map(([model,n])=><div key={model}><span className="truncate">{model}</span><strong>{fmt(n)}</strong><i><b style={{width:pct(n,modelCounts[0]?.[1]||1)}}/></i></div>)}</div>
    </InsightCard>

    <InsightCard title="Devices per user" subtitle="Managed-device density across identified users">
      <div className="metricTiles userTiles">{userDistribution.map(([label,n])=><Metric key={label} label={label} value={fmt(n)}/>)}</div><div className="inlineInsight"><span>No primary user</span><strong>{fmt(noUser)}</strong><small>{pct(noUser,total)} of devices</small></div>
    </InsightCard>

    <InsightCard title="Inventory anomalies" subtitle="Potential duplicates and inconsistent inventory signals">
      <div className="anomalyList"><Anomaly label="Duplicate serial entries" value={duplicateSerials}/><Anomaly label="Duplicate device names" value={duplicateNames}/><Anomaly label="Missing serial number" value={missingSerial}/><Anomaly label="Unknown platform" value={unknownPlatform}/></div>
    </InsightCard>

    <InsightCard title="Activity distribution" subtitle="Recency of the most recent reported Intune check-in">
      <div className="activityBars">{activity.map(([label,n])=><div key={label}><div><span>{label}</span><strong>{fmt(n)}</strong><small>{pct(n,total)}</small></div><i><b style={{width:pct(n,total)}}/></i></div>)}</div>
    </InsightCard>
  </section>
}

function InsightCard({title,subtitle,children}:{title:string;subtitle:string;children:React.ReactNode}){return <article className="dashboardCard extendedInsightCard"><header className="dashboardCardHead"><div><h2>{title}</h2><p>{subtitle}</p></div></header>{children}</article>}
function Distribution({rows,total}:{rows:[string,number][];total:number}){return <div className="distributionList">{rows.slice(0,7).map(([label,n],i)=><div key={label}><span className={`distributionDot dot${i%6}`}/><span className="truncate">{label}</span><strong>{fmt(n)}</strong><small>{pct(n,total)}</small><i><b style={{width:pct(n,total)}}/></i></div>)}</div>}
function Metric({label,value}:{label:string;value:string}){return <div className="metricTile"><span>{label}</span><strong>{value}</strong></div>}
function Anomaly({label,value}:{label:string;value:number}){return <div className={value?'anomaly hasValue':'anomaly'}><span>{label}</span><strong>{fmt(value)}</strong></div>}
