import { useMemo, useRef, useState } from 'react';
import { importInventory } from './importer';
import SmartTable from './SmartTable';
import ExtendedInsights from './ExtendedInsights';
import WindowsUpdateHealth from './WindowsUpdateHealth';
import EncryptionCard, { securityAttention } from './SecurityInsights';
import DashboardSection from './DashboardSection';
import type { SmartColumn } from './SmartTable';
import type { Device, ImportResult } from './types';

const platformLabel: Record<string,string> = { windows:'Windows', android:'Android', ios:'iOS', ipados:'iPadOS', macos:'macOS', linux:'Linux', unknown:'Unknown' };
const key = (v:string|null) => v?.trim() || 'Unknown';
const countBy = (devices:Device[], selector:(d:Device)=>string) => Object.entries(devices.reduce<Record<string,number>>((acc,d)=>{ const k=selector(d); acc[k]=(acc[k]??0)+1; return acc; },{})).sort((a,b)=>b[1]-a[1]);
const formatNumber = (value:number) => value.toLocaleString();
const daysSince = (value:string|null) => { if(!value) return null; const time=Date.parse(value); return Number.isFinite(time)?(Date.now()-time)/(24*60*60*1000):null };
const rawValue=(d:Device,pattern:RegExp)=>Object.entries(d.raw).find(([name])=>pattern.test(name))?.[1]?.trim()||'';

type View = 'overview'|'devices'|'users'|'hardware'|'updates'|'reports';
type Filter = { field:'compliance'|'osVersion'|'manufacturer'|'model'|'user'|'encryption'; label:string; value:string } | null;
type UserRow={name:string;upn:string;devices:Device[]};
type HardwareRow={manufacturer:string;model:string;devices:Device[]};
type UpdateRow={platform:string;version:string;devices:Device[]};

export default function App(){
  const [data,setData] = useState<ImportResult|null>(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState<string|null>(null);
  const [view,setView] = useState<View>('overview');
  const [query,setQuery] = useState('');
  const [platform,setPlatform] = useState<string|null>(null);
  const [filter,setFilter] = useState<Filter>(null);
  const [selected,setSelected] = useState<Device|null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function open(file?:File){
    if(!file) return;
    setBusy(true); setError(null);
    try { setData(await importInventory(file)); setView('overview'); setPlatform(null); setFilter(null); setQuery(''); }
    catch(e){ setError(e instanceof Error ? e.message : 'The export could not be read.'); }
    finally { setBusy(false); }
  }

  function drill(field:NonNullable<Filter>['field'],label:string,value:string){ setFilter({field,label,value}); setView('devices'); setQuery(''); window.scrollTo({top:0,behavior:'smooth'}); }

  const base = useMemo(()=>data?.devices.filter(d=>!platform || d.platform===platform) ?? [],[data,platform]);
  const scoped = useMemo(()=>base.filter(d=>{ if(!filter) return true; const value = filter.field==='compliance' ? d.compliance : filter.field==='osVersion' ? d.osVersion : filter.field==='manufacturer' ? d.manufacturer : filter.field==='model' ? d.model : filter.field==='user' ? (d.userUpn||d.userDisplayName) : rawValue(d,/^encrypted$/i).toLowerCase(); return filter.field==='encryption' ? value===filter.value.toLowerCase() : key(value)===filter.value; }),[base,filter]);
  const q=query.trim().toLowerCase();
  const searched=scoped.filter(d=>!q || [d.deviceName,d.serialNumber,d.userDisplayName,d.userUpn,d.manufacturer,d.model,d.osVersion].some(v=>v?.toLowerCase().includes(q)));
  const platforms=useMemo(()=>data?countBy(data.devices,d=>d.platform):[],[data]);
  const compliance=useMemo(()=>countBy(base,d=>key(d.compliance)),[base]);
  const manufacturers=useMemo(()=>countBy(base,d=>key(d.manufacturer)),[base]);
  const compliant=compliance.find(([v])=>v.toLowerCase()==='compliant')?.[1]??0;
  const noncompliant=compliance.find(([v])=>v.toLowerCase()==='noncompliant')?.[1]??0;
  const grace=compliance.find(([v])=>v.toLowerCase()==='ingraceperiod')?.[1]??0;
  const stale=useMemo(()=>base.filter(d=>{const age=daysSince(d.lastCheckIn);return age!==null&&age>30}).length,[base]);
  const unknownModels=useMemo(()=>base.filter(d=>!d.model||d.model.trim()===''||d.model.toLowerCase()==='unknown').length,[base]);
  const noUser=useMemo(()=>base.filter(d=>!d.userUpn&&!d.userDisplayName).length,[base]);

  const users=useMemo<UserRow[]>(()=>{const map=new Map<string,UserRow>();for(const d of base){const id=key(d.userUpn||d.userDisplayName);if(id==='Unknown')continue;const item=map.get(id)??{name:d.userDisplayName||id,upn:d.userUpn||'',devices:[]};item.devices.push(d);map.set(id,item)}return[...map.values()].sort((a,b)=>b.devices.length-a.devices.length)},[base]);
  const hardware=useMemo<HardwareRow[]>(()=>{const map=new Map<string,HardwareRow>();for(const d of base){const manufacturer=key(d.manufacturer),model=key(d.model),id=manufacturer+'|'+model;const item=map.get(id)??{manufacturer,model,devices:[]};item.devices.push(d);map.set(id,item)}return[...map.values()].sort((a,b)=>b.devices.length-a.devices.length)},[base]);
  const updates=useMemo<UpdateRow[]>(()=>{const map=new Map<string,UpdateRow>();for(const d of base){const version=key(d.osVersion),id=d.platform+'|'+version;const item=map.get(id)??{platform:d.platform,version,devices:[]};item.devices.push(d);map.set(id,item)}return[...map.values()].sort((a,b)=>b.devices.length-a.devices.length)},[base]);

  const filteredUsers=users.filter(u=>!q||u.name.toLowerCase().includes(q)||u.upn.toLowerCase().includes(q));
  const filteredHardware=hardware.filter(h=>!q||h.manufacturer.toLowerCase().includes(q)||h.model.toLowerCase().includes(q));
  const filteredUpdates=updates.filter(r=>!q||r.version.toLowerCase().includes(q)||(platformLabel[r.platform]||r.platform).toLowerCase().includes(q));

  const deviceColumns:SmartColumn<Device>[]=[
    {key:'device',label:'Device',value:d=>d.deviceName||'',render:d=><><strong>{d.deviceName||'—'}</strong><small>{d.serialNumber}</small></>},
    {key:'platform',label:'Platform',value:d=>platformLabel[d.platform]||d.platform,render:d=><span className="tag">{platformLabel[d.platform]}</span>},
    {key:'os',label:'OS version',value:d=>d.osVersion||''},
    {key:'hardware',label:'Manufacturer / model',value:d=>[d.manufacturer,d.model].filter(Boolean).join(' · ')},
    {key:'user',label:'Primary user',value:d=>d.userDisplayName||d.userUpn||''},
    {key:'compliance',label:'Compliance',value:d=>d.compliance||''},
    {key:'checkin',label:'Last check-in',value:d=>d.lastCheckIn||''}
  ];
  const userColumns:SmartColumn<UserRow>[]=[
    {key:'user',label:'User',value:u=>u.name,render:u=><><strong>{u.name}</strong><small>{u.upn}</small></>},
    {key:'devices',label:'Devices',value:u=>u.devices.length,numeric:true},
    {key:'platforms',label:'Platforms',value:u=>countBy(u.devices,d=>platformLabel[d.platform]).map(([p,n])=>`${p} ${n}`).join(' · ')},
    {key:'compliance',label:'Compliance',value:u=>u.devices.length?u.devices.filter(d=>d.compliance?.toLowerCase()==='compliant').length/u.devices.length*100:0,numeric:true,render:u=>{const c=u.devices.filter(d=>d.compliance?.toLowerCase()==='compliant').length;return `${c}/${u.devices.length}`}}
  ];
  const hardwareColumns:SmartColumn<HardwareRow>[]=[
    {key:'manufacturer',label:'Manufacturer',value:h=>h.manufacturer,render:h=><strong>{h.manufacturer}</strong>},
    {key:'model',label:'Reported model',value:h=>h.model},
    {key:'devices',label:'Devices',value:h=>h.devices.length,numeric:true},
    {key:'platform',label:'Platform',value:h=>countBy(h.devices,d=>platformLabel[d.platform]).map(([p,n])=>`${p} ${n}`).join(' · ')},
    {key:'compliance',label:'Compliance',value:h=>h.devices.length?h.devices.filter(d=>d.compliance?.toLowerCase()==='compliant').length/h.devices.length*100:0,numeric:true,render:h=>{const c=h.devices.filter(d=>d.compliance?.toLowerCase()==='compliant').length;return `${c}/${h.devices.length}`}}
  ];
  const updateColumns:SmartColumn<UpdateRow>[]=[
    {key:'platform',label:'Platform',value:r=>platformLabel[r.platform]||r.platform,render:r=><span className="tag">{platformLabel[r.platform]}</span>},
    {key:'version',label:'Reported version',value:r=>r.version,render:r=><strong>{r.version}</strong>},
    {key:'devices',label:'Devices',value:r=>r.devices.length,numeric:true},
    {key:'share',label:'Share',value:r=>base.length?r.devices.length/base.length*100:0,numeric:true,render:r=>`${base.length?(r.devices.length/base.length*100).toFixed(1):'0'}%`}
  ];

  const nav:[View,string][]=[['overview','Overview'],['devices','Devices'],['users','Users'],['hardware','Hardware'],['updates','Updates'],['reports','Reports']];
  const pageTitle=view==='overview'?'Inventory dashboard':view==='devices'?'Devices':view==='users'?'Users':view==='hardware'?'Hardware':view==='updates'?'Updates':'Reports';
  const pageDescription=view==='overview'?'Health, composition and attention points from the current Intune inventory.':view==='devices'?'Search and inspect every device in the imported inventory.':view==='users'?'See which users have managed devices and drill into their inventory.':view==='hardware'?'Explore manufacturers and reported hardware models.':view==='updates'?'Update health and operating system versions enriched with Device Intelligence.':'Prepare management-ready exports and summaries from the current inventory.';

  return <div className="app">
    <header className="topbar"><div className="topbarInner">
      <button className="brand" onClick={()=>data&&setView('overview')}><span className="brandMark">ID</span><span><strong>Intune Device Inventory</strong><small>Analyzer</small></span></button>
      <nav className={`mainNav ${!data?'landingNav':''}`}>{nav.map(([id,label])=><button key={id} disabled={!data} className={data&&view===id?'active':''} onClick={()=>{if(data){setView(id);setQuery('')}}}>{label}</button>)}</nav>
      <div className="topActions landingActions"><span className="localState"><i/>Local only</span><button className="primarySmall" onClick={()=>input.current?.click()}>Open export</button></div>
      <input ref={input} hidden type="file" accept=".zip,.csv" onChange={e=>open(e.target.files?.[0])}/>
    </div></header>

    {!data?<main className="landing landingPro">
      <section className="hero heroPro"><div className="heroBadge">◇ 100% PRIVATE BY DESIGN</div><h1>Understand your<br/>Intune device <em>inventory.</em></h1><p>Open a native Microsoft Intune inventory export and turn raw device data into a clear, interactive overview. Everything is processed locally in your browser.</p><div className="featureGrid"><Feature icon="◇" title="100% local" text="Your data never leaves this browser"/><Feature icon="▣" title="Private by design" text="No uploads, no servers, no tracking"/><Feature icon="ϟ" title="Fast & secure" text="All processing happens on your device"/><Feature icon="▤" title="Native Intune export" text="Supports ZIP or CSV exports"/></div>{busy&&<div className="loadingState">Reading and normalizing inventory…</div>}{error&&<div className="error">{error}</div>}</section>
      <section className="drop cleanDrop dropPro" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();open(e.dataTransfer.files[0])}} onClick={()=>input.current?.click()}><span className="dropIcon dropCloud">↥</span><strong>Drop your Intune export here</strong><small>or click anywhere in this area to browse files</small><span className="dropFormats">ZIP · CSV</span></section>
      <section className="trustStrip"><Trust icon="♙" title="Your data stays with you" text="All files are read locally. Nothing is sent anywhere, ever."/><Trust icon="✓" title="Works offline" text="After loading your export, analysis remains local to your browser."/><Trust icon="▱" title="Built for real inventories" text="Designed for large Intune exports with thousands of devices."/></section>
    </main>:<main className="workspace dashboardWorkspace">
      <section className="pageHead dashboardHead"><div><span className="eyebrow">{view.toUpperCase()}</span><h1>{pageTitle}</h1><p>{pageDescription}</p></div>{view==='overview'?<PlatformSelect value={platform} platforms={platforms} onChange={p=>{setPlatform(p);setFilter(null)}}/>:view!=='reports'?<Search value={query} setValue={setQuery}/>:null}</section>
      {view!=='overview'&&<div className="platformStrip"><button className={!platform?'active':''} onClick={()=>{setPlatform(null);setFilter(null)}}><span>All platforms</span><strong>{data.devices.length.toLocaleString()}</strong></button>{platforms.map(([p,n])=><button key={p} className={platform===p?'active':''} onClick={()=>{setPlatform(platform===p?null:p);setFilter(null)}}><span>{platformLabel[p]}</span><strong>{n.toLocaleString()}</strong></button>)}</div>}
      {(platform||filter)&&view!=='overview'&&<div className="activeFilters"><span>Viewing</span>{platform&&<b>{platformLabel[platform]}</b>}{filter&&<b>{filter.label}: {filter.value}</b>}<span>{scoped.length.toLocaleString()} devices</span><button onClick={()=>{setPlatform(null);setFilter(null)}}>Clear</button></div>}
      {view==='overview'&&<Overview devices={base} allDevices={data.devices} total={base.length} users={users.length} models={hardware.length} compliant={compliant} noncompliant={noncompliant} grace={grace} stale={stale} compliance={compliance} platforms={platforms} platform={platform} onPlatform={setPlatform} drill={drill}/>} 
      {view==='devices'&&<DataCard title="Device inventory" subtitle={`${searched.length.toLocaleString()} matching devices`}><SmartTable rows={searched} columns={deviceColumns} rowKey={d=>d.id} exportName="intune-devices" onRowClick={setSelected}/></DataCard>}
      {view==='users'&&<DataCard title="Managed users" subtitle={`${filteredUsers.length.toLocaleString()} matching users`}><SmartTable rows={filteredUsers} columns={userColumns} rowKey={u=>u.upn||u.name} exportName="intune-users" onRowClick={u=>drill('user','User',key(u.upn||u.name))}/></DataCard>}
      {view==='hardware'&&<DataCard title="Hardware inventory" subtitle={`${filteredHardware.length.toLocaleString()} matching manufacturer/model combinations`}><SmartTable rows={filteredHardware} columns={hardwareColumns} rowKey={h=>h.manufacturer+'|'+h.model} exportName="intune-hardware" onRowClick={h=>drill('model','Model',h.model)}/></DataCard>}
      {view==='updates'&&<><WindowsUpdateHealth devices={base}/><DataCard title="All reported OS versions" subtitle={`${filteredUpdates.length.toLocaleString()} matching platform/version combinations`}><SmartTable rows={filteredUpdates} columns={updateColumns} rowKey={r=>r.platform+'|'+r.version} exportName="intune-os-versions" onRowClick={r=>drill('osVersion','OS version',r.version)}/></DataCard></>}
      {view==='reports'&&<section className="reportsPlaceholder"><div className="reportsIcon">▤</div><h2>Management reports</h2><p>PDF and PowerPoint reporting will be built here using the currently loaded inventory. The report engine will remain fully local in the browser.</p><span>Planned: executive summary · platform overview · compliance · update position · hardware</span></section>}
    </main>}

    <footer className="siteFooter professionalFooter"><div className="footerBrand"><span className="footerMark">ID</span><div><strong>Intune Device Inventory Analyzer</strong><span>Open-source device inventory analysis for Microsoft Intune.</span></div></div><div className="footerPrivacy"><strong>Private by design</strong><span>Inventory processing happens locally in your browser. No device or user data is uploaded.</span></div><div className="footerMeta"><span>Open source</span><span>GitHub Pages</span><strong>v0.1.0</strong></div></footer>
    {selected&&<DeviceDetail device={selected} onClose={()=>setSelected(null)}/>} 
  </div>;
}

function Feature({icon,title,text}:{icon:string;title:string;text:string}){return <article className="feature"><span>{icon}</span><div><strong>{title}</strong><small>{text}</small></div></article>}
function Trust({icon,title,text}:{icon:string;title:string;text:string}){return <article className="trustItem"><span>{icon}</span><div><strong>{title}</strong><small>{text}</small></div></article>}
function PlatformSelect({value,platforms,onChange}:{value:string|null;platforms:[string,number][];onChange:(value:string|null)=>void}){return <label className="platformSelect"><span>Platform</span><select value={value||''} onChange={e=>onChange(e.target.value||null)}><option value="">All platforms</option>{platforms.map(([p,n])=><option key={p} value={p}>{platformLabel[p]} · {formatNumber(n)}</option>)}</select></label>}

function Overview({devices,allDevices,total,users,models,compliant,noncompliant,grace,stale,compliance,platforms,platform,onPlatform,drill}:{devices:Device[];allDevices:Device[];total:number;users:number;models:number;compliant:number;noncompliant:number;grace:number;stale:number;compliance:[string,number][];platforms:[string,number][];platform:string|null;onPlatform:(p:string|null)=>void;drill:(f:NonNullable<Filter>['field'],l:string,v:string)=>void}){
  const compliancePct=total?compliant/total*100:0;
  const platformHealth=Object.entries(devices.reduce<Record<string,Device[]>>((acc,d)=>{(acc[d.platform]??=[]).push(d);return acc},{})).map(([p,list])=>({platform:p,devices:list.length,compliant:list.filter(d=>d.compliance?.toLowerCase()==='compliant').length,stale:list.filter(d=>{const age=daysSince(d.lastCheckIn);return age!==null&&age>30}).length})).sort((a,b)=>b.devices-a.devices);
  const staleBuckets=[{label:'30–60 days',count:devices.filter(d=>{const age=daysSince(d.lastCheckIn);return age!==null&&age>30&&age<=60}).length,tone:'mild'},{label:'60–90 days',count:devices.filter(d=>{const age=daysSince(d.lastCheckIn);return age!==null&&age>60&&age<=90}).length,tone:'warn'},{label:'Over 90 days',count:devices.filter(d=>{const age=daysSince(d.lastCheckIn);return age!==null&&age>90}).length,tone:'bad'}];
  const security=securityAttention(devices);
  return <div className="inventoryDashboard">
    <section className="healthKpis"><HealthKpi icon="devices" label="Devices" value={formatNumber(total)} note={platform?`${platformLabel[platform]} inventory`:'Managed inventory'} tone="blue"/><HealthKpi icon="users" label="Users" value={formatNumber(users)} note={`${total?((users/total)*100).toFixed(0):0}% user/device ratio`} tone="neutral"/><HealthKpi icon="shield" label="Compliance" value={`${compliancePct.toFixed(1)}%`} note={`${formatNumber(compliant)} compliant`} tone={compliancePct>=90?'good':compliancePct>=75?'warn':'bad'}/><HealthKpi icon="clock" label="Stale > 30 days" value={formatNumber(stale)} note={stale?'Needs review':'No stale check-ins'} tone={stale?'warn':'good'}/></section>

    <DashboardSection icon="security" title="Health & Security" subtitle="Security posture, compliance and signals that may require attention.">
      <section className="dashboardMainGrid securityMainGrid">
        <DashboardCard title="Compliance status" subtitle="Current device compliance state" className="complianceCard"><Donut total={total} items={compliance} centerLabel={`${compliancePct.toFixed(1)}%`} centerSub="compliant"/><div className="legendList complianceLegend">{compliance.slice(0,5).map(([v,n],i)=><button key={v} onClick={()=>drill('compliance','Compliance',v)}><i className={`legendDot status${i}`}/><span>{humanize(v)}</span><strong>{formatNumber(n)}</strong><small>{total?(n/total*100).toFixed(1):0}%</small></button>)}</div></DashboardCard>
        <EncryptionCard devices={devices} onNotEncrypted={()=>security.notEncrypted&&drill('encryption','Encryption','false')}/>
        <DashboardCard title="Needs attention" subtitle="Signals worth investigating first" className="attentionCard"><div className="attentionList"><AttentionItem tone="bad" title="Noncompliant devices" value={noncompliant} detail="Compliance policy action required" onClick={()=>noncompliant&&drill('compliance','Compliance','Noncompliant')}/><AttentionItem tone="warn" title="Not encrypted" value={security.notEncrypted} detail="Device reports encryption disabled" onClick={()=>security.notEncrypted&&drill('encryption','Encryption','false')}/><AttentionItem tone="warn" title="In grace period" value={grace} detail="Approaching compliance deadline" onClick={()=>grace&&drill('compliance','Compliance','InGracePeriod')}/>{security.wipePending>0&&<AttentionItem tone="bad" title="Wipe pending" value={security.wipePending} detail="Device has a pending wipe state"/>}{security.approvalPending>0&&<AttentionItem tone="warn" title="Approval pending" value={security.approvalPending} detail="Registration still awaiting approval"/>}{security.rooted>0&&<AttentionItem tone="bad" title="Jailbroken / rooted" value={security.rooted} detail="Device reports an unsafe root state"/>}</div></DashboardCard>
      </section>
      <section className="fleetInsightGrid">
        <DashboardCard title="Platform health" subtitle="Compliance and activity by platform" className="platformHealthCard"><div className="platformHealthTable"><div className="healthTableHead"><span>Platform</span><span>Devices</span><span>Compliant</span><span>Stale</span></div>{platformHealth.map(row=><button key={row.platform} onClick={()=>onPlatform(platform===row.platform?null:row.platform)}><strong>{platformLabel[row.platform]||row.platform}</strong><span>{formatNumber(row.devices)}</span><span className={row.devices&&row.compliant/row.devices>=.9?'goodText':row.devices&&row.compliant/row.devices>=.75?'warnText':'badText'}>{row.devices?(row.compliant/row.devices*100).toFixed(1):'0'}%</span><span className={row.stale?'warnText':''}>{formatNumber(row.stale)}</span></button>)}</div></DashboardCard>
        <DashboardCard title="Check-in age" subtitle="How long stale devices have been inactive" className="checkinCard"><div className="staleBuckets">{staleBuckets.map(item=><div key={item.label} className={`staleBucket ${item.tone}`}><span>{item.label}</span><strong>{formatNumber(item.count)}</strong><small>{total?(item.count/total*100).toFixed(1):'0'}% of inventory</small></div>)}</div><div className="checkinSummary"><span>Active within 30 days</span><strong>{formatNumber(Math.max(0,total-stale))}</strong><small>{total?((total-stale)/total*100).toFixed(1):'0'}%</small></div></DashboardCard>
      </section>
    </DashboardSection>

    <DashboardSection icon="fleet" title="Fleet & Hardware" subtitle="Composition, hardware mix and standardization across the current inventory view.">
      <section className="dashboardMainGrid fleetOverviewGrid">
        <DashboardCard title="Platform distribution" subtitle="Device mix across the imported inventory" className="platformCard"><Donut total={allDevices.length} items={platforms} centerLabel={formatNumber(allDevices.length)} centerSub="devices"/><div className="legendList">{platforms.map(([p,n],i)=><button key={p} className={platform===p?'selected':''} onClick={()=>onPlatform(platform===p?null:p)}><i className={`legendDot dot${i%6}`}/><span>{platformLabel[p]||p}</span><strong>{formatNumber(n)}</strong><small>{allDevices.length?(n/allDevices.length*100).toFixed(1):0}%</small></button>)}</div></DashboardCard>
        <DashboardCard title="Fleet summary" subtitle="Current scope at a glance" className="fleetSummaryCard"><div className="metricTiles"><div className="metricTile"><span>Devices</span><strong>{formatNumber(total)}</strong></div><div className="metricTile"><span>Users</span><strong>{formatNumber(users)}</strong></div><div className="metricTile"><span>Models</span><strong>{formatNumber(models)}</strong></div></div><p className="insightFootnote">Use the cards below to explore hardware type, ownership, manufacturers, models and standardization.</p></DashboardCard>
      </section>
      <ExtendedInsights devices={devices}/>
    </DashboardSection>
  </div>;
}

function humanize(value:string){return value.replace(/([a-z])([A-Z])/g,'$1 $2')}
function HealthKpi({icon,label,value,note,tone}:{icon:string;label:string;value:string;note:string;tone:string}){return <article className={`healthKpi ${tone}`}><span className={`healthIcon ${icon}`}/><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></article>}
function DashboardCard({title,subtitle,className='',children}:{title:string;subtitle:string;className?:string;children:React.ReactNode}){return <article className={`dashboardCard ${className}`}><header className="dashboardCardHead"><div><h2>{title}</h2><p>{subtitle}</p></div></header>{children}</article>}
function Donut({total,items,centerLabel,centerSub}:{total:number;items:[string,number][];centerLabel:string;centerSub:string}){let cursor=0;const stops=items.map(([,n],i)=>{const start=cursor;cursor+=total?n/total*100:0;return `var(--chart-${i%6}) ${start}% ${cursor}%`});return <div className="donut" style={{background:`conic-gradient(${stops.join(',')||'#e7eef7 0 100%'})`}}><div><strong>{centerLabel}</strong><span>{centerSub}</span></div></div>}
function AttentionItem({tone,title,value,detail,onClick}:{tone:string;title:string;value:number;detail:string;onClick?:()=>void}){return <button className={`attentionItem ${tone}`} onClick={onClick} disabled={!onClick}><span className="attentionSignal"/><div><strong>{title}</strong><small>{detail}</small></div><b>{formatNumber(value)}</b><span className="attentionArrow">›</span></button>}
function Search({value,setValue}:{value:string;setValue:(v:string)=>void}){return <div className="search"><span>⌕</span><input value={value} onChange={e=>setValue(e.target.value)} placeholder="Search…"/></div>}
function DataCard({title,subtitle,children}:{title:string;subtitle:string;children:React.ReactNode}){return <section className="dataCard"><div className="dataHead"><div><h2>{title}</h2><p>{subtitle}</p></div></div>{children}</section>}
function DeviceDetail({device,onClose}:{device:Device;onClose:()=>void}){const groups=groupRaw(device.raw);return <div className="drawerShade" onMouseDown={e=>e.target===e.currentTarget&&onClose()}><aside className="drawer"><div className="drawerTop"><button onClick={onClose}>← Back</button><span className="tag">{platformLabel[device.platform]}</span></div><section className="drawerHero"><span className="eyebrow">DEVICE DETAIL</span><h2>{device.deviceName||'Unnamed device'}</h2><p>{[device.manufacturer,device.model].filter(Boolean).join(' · ')||'Unknown hardware'} · {device.compliance||'Unknown compliance'}</p></section><section className="detailCards"><DetailCard title="Identity" rows={[['Device ID',device.id],['Serial number',device.serialNumber],['Primary user',device.userDisplayName],['User UPN',device.userUpn]]}/><DetailCard title="Operating system" rows={[['Platform',platformLabel[device.platform]],['Source OS',device.sourceOS],['OS version',device.osVersion]]}/><DetailCard title="Management" rows={[['Managed by',device.managedBy],['Ownership',device.ownership],['Compliance',device.compliance],['Last check-in',device.lastCheckIn]]}/><DetailCard title="Hardware" rows={[['Manufacturer',device.manufacturer],['Model',device.model]]}/></section><div className="rawTitle"><div><h3>Raw Intune data</h3><p>Original values from the imported export.</p></div><span>{Object.keys(device.raw).length} fields</span></div>{Object.entries(groups).map(([name,entries])=><details className="raw" key={name} open={name==='Device & management'}><summary>{name} · {entries.length}</summary><div className="rawGrid">{entries.map(([k,v])=><div key={k}><span>{k}</span><strong>{v||'—'}</strong></div>)}</div></details>)}</aside></div>}
function DetailCard({title,rows}:{title:string;rows:[string,string|null][]}){return <article><h3>{title}</h3>{rows.map(([label,value])=><div key={label}><span>{label}</span><strong>{value||'—'}</strong></div>)}</article>}
function groupRaw(raw:Record<string,string>){const result:Record<string,[string,string][]>= {'Device & management':[],'User':[],'Hardware':[],'Operating system':[],'Security':[],'Storage & network':[],'Other':[]};for(const entry of Object.entries(raw)){const name=entry[0].toLowerCase();let group='Other';if(/user|email|upn/.test(name))group='User';else if(/manufacturer|model|serial|processor|tpm|bios|architecture|physical|memory/.test(name))group='Hardware';else if(/os|operating|version|build|edition|sku/.test(name))group='Operating system';else if(/compliance|encrypt|secure|defender|firewall|password|threat/.test(name))group='Security';else if(/storage|disk|wifi|wi-fi|ethernet|ip address|mac address|imei|meid|phone|network|subscriber/.test(name))group='Storage & network';else if(/device|managed|management|enroll|ownership|join|check-in|last sync|intune|azure|entra/.test(name))group='Device & management';result[group].push(entry)}return Object.fromEntries(Object.entries(result).filter(([,entries])=>entries.length))}