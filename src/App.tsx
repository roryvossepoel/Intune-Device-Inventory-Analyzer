import { useMemo, useRef, useState } from 'react';
import { importInventory } from './importer';
import { createDemoInventory } from './demoData';
import SmartTable from './SmartTable';
import ExtendedInsights from './ExtendedInsights';
import WindowsUpdateHealth from './WindowsUpdateHealth';
import EncryptionCard, { securityAttention } from './SecurityInsights';
import DashboardSection from './DashboardSection';
import LandingContent from './LandingContent';
import FaqPage from './FaqPage';
import type { SmartColumn } from './SmartTable';
import type { Device, ImportResult } from './types';

const platformLabel: Record<string,string> = { windows:'Windows', android:'Android', ios:'iOS', ipados:'iPadOS', macos:'macOS', linux:'Linux', unknown:'Unknown' };
const key = (v:string|null) => v?.trim() || 'Unknown';
const countBy = (devices:Device[], selector:(d:Device)=>string) => Object.entries(devices.reduce<Record<string,number>>((acc,d)=>{ const k=selector(d); acc[k]=(acc[k]??0)+1; return acc; },{})).sort((a,b)=>b[1]-a[1]);
const formatNumber = (value:number) => value.toLocaleString();
const daysSince = (value:string|null) => { if(!value) return null; const time=Date.parse(value); return Number.isFinite(time)?(Date.now()-time)/(24*60*60*1000):null };
const rawValue=(d:Device,pattern:RegExp)=>Object.entries(d.raw).find(([name])=>pattern.test(name))?.[1]?.trim()||'';

type View = 'overview'|'devices'|'updates'|'reports'|'faq';
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
  const [demoMode,setDemoMode] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function open(file?:File){
    if(!file) return;
    setBusy(true); setError(null);
    try { setData(await importInventory(file)); setDemoMode(false); setView('overview'); setPlatform(null); setFilter(null); setQuery(''); }
    catch(e){ setError(e instanceof Error ? e.message : 'The export could not be read.'); }
    finally { setBusy(false); }
  }

  function openDemo(target:View='overview'){
    setData(createDemoInventory()); setDemoMode(true); setView(target); setPlatform(null); setFilter(null); setQuery('');
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function navigate(target:View){
    if(target==='faq'){setView('faq');window.scrollTo({top:0,behavior:'smooth'});return;}
    if(!data){openDemo(target);return;}
    setView(target);setQuery('');window.scrollTo({top:0,behavior:'smooth'});
  }

  function drill(field:NonNullable<Filter>['field'],label:string,value:string){ setFilter({field,label,value}); setView('devices'); setQuery(''); window.scrollTo({top:0,behavior:'smooth'}); }

  const base = useMemo(()=>data?.devices.filter(d=>!platform || d.platform===platform) ?? [],[data,platform]);
  const scoped = useMemo(()=>base.filter(d=>{ if(!filter) return true; const value = filter.field==='compliance' ? d.compliance : filter.field==='osVersion' ? d.osVersion : filter.field==='manufacturer' ? d.manufacturer : filter.field==='model' ? d.model : filter.field==='user' ? (d.userUpn||d.userDisplayName) : rawValue(d,/^encrypted$/i).toLowerCase(); return filter.field==='encryption' ? value===filter.value.toLowerCase() : key(value)===filter.value; }),[base,filter]);
  const q=query.trim().toLowerCase();
  const searched=scoped.filter(d=>!q || [d.deviceName,d.serialNumber,d.userDisplayName,d.userUpn,d.manufacturer,d.model,d.osVersion].some(v=>v?.toLowerCase().includes(q)));
  const platforms=useMemo(()=>data?countBy(data.devices,d=>d.platform):[],[data]);
  const compliance=useMemo(()=>countBy(base,d=>key(d.compliance)),[base]);
  const compliant=compliance.find(([v])=>v.toLowerCase()==='compliant')?.[1]??0;
  const noncompliant=compliance.find(([v])=>v.toLowerCase()==='noncompliant')?.[1]??0;
  const grace=compliance.find(([v])=>v.toLowerCase()==='ingraceperiod')?.[1]??0;
  const stale=useMemo(()=>base.filter(d=>{const age=daysSince(d.lastCheckIn);return age!==null&&age>30}).length,[base]);
  const users=useMemo<UserRow[]>(()=>{const map=new Map<string,UserRow>();for(const d of base){const id=key(d.userUpn||d.userDisplayName);if(id==='Unknown')continue;const item=map.get(id)??{name:d.userDisplayName||id,upn:d.userUpn||'',devices:[]};item.devices.push(d);map.set(id,item)}return[...map.values()].sort((a,b)=>b.devices.length-a.devices.length)},[base]);
  const hardware=useMemo<HardwareRow[]>(()=>{const map=new Map<string,HardwareRow>();for(const d of base){const manufacturer=key(d.manufacturer),model=key(d.model),id=manufacturer+'|'+model;const item=map.get(id)??{manufacturer,model,devices:[]};item.devices.push(d);map.set(id,item)}return[...map.values()].sort((a,b)=>b.devices.length-a.devices.length)},[base]);
  const updates=useMemo<UpdateRow[]>(()=>{const map=new Map<string,UpdateRow>();for(const d of base){const version=key(d.osVersion),id=d.platform+'|'+version;const item=map.get(id)??{platform:d.platform,version,devices:[]};item.devices.push(d);map.set(id,item)}return[...map.values()].sort((a,b)=>b.devices.length-a.devices.length)},[base]);
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
  const updateColumns:SmartColumn<UpdateRow>[]=[
    {key:'platform',label:'Platform',value:r=>platformLabel[r.platform]||r.platform,render:r=><span className="tag">{platformLabel[r.platform]}</span>},
    {key:'version',label:'Reported version',value:r=>r.version,render:r=><strong>{r.version}</strong>},
    {key:'devices',label:'Devices',value:r=>r.devices.length,numeric:true},
    {key:'share',label:'Share',value:r=>base.length?r.devices.length/base.length*100:0,numeric:true,render:r=>`${base.length?(r.devices.length/base.length*100).toFixed(1):'0'}%`}
  ];
  const nav:[View,string][]=[['overview','Overview'],['devices','Devices'],['updates','Updates'],['reports','Reports'],['faq','FAQ']];
  const pageTitle=view==='overview'?'Inventory dashboard':view==='devices'?'Devices':view==='updates'?'Updates':view==='reports'?'Reports':'FAQ';
  const pageDescription=view==='overview'?'Health, composition and attention points from the current Intune inventory.':view==='devices'?'Search and inspect every device in the imported inventory.':view==='updates'?'Update health and operating system versions enriched with Device Intelligence.':'Prepare management-ready exports and summaries from the current inventory.';

  return <div className="app">
    <header className="topbar publicTopbar"><div className="topbarInner">
      <button className="brand" onClick={()=>data?navigate('overview'):window.scrollTo({top:0,behavior:'smooth'})}><span className="brandMark">ID</span><span><strong>Intune Device Inventory</strong><small>Analyzer</small></span></button>
      <nav className="mainNav publicNav">{nav.map(([id,label])=><button key={id} className={view===id&&data?'active':''} onClick={()=>navigate(id)}>{label}</button>)}</nav>
      <div className="topActions landingActions"><button className="primarySmall" onClick={()=>input.current?.click()}>Open export</button></div>
      <input ref={input} hidden type="file" accept=".zip,.csv" onChange={e=>open(e.target.files?.[0])}/>
    </div></header>

    {view==='faq'?<FaqPage/>:!data?<main className="landing landingPro">
      <section className="hero heroPro"><div className="heroBadge">◇ 100% PRIVATE BY DESIGN</div><h1>Understand your<br/>Intune device <em>inventory.</em></h1><p>Open a native Microsoft Intune inventory export and turn raw device data into a clear, interactive overview. Everything is processed locally in your browser.</p><div className="landingCtas"><button className="landingPrimary" onClick={()=>input.current?.click()}>↥ Open Intune export</button><button className="landingSecondary" onClick={()=>openDemo('overview')}>Try with demo data →</button></div><small className="demoHint">No export available? Explore the complete experience with a local, fictional demo inventory.</small><div className="featureGrid"><Feature icon="◇" title="100% local" text="Your data never leaves this browser"/><Feature icon="▣" title="Private by design" text="No uploads, no servers, no tracking"/><Feature icon="ϟ" title="Fast & secure" text="All processing happens on your device"/><Feature icon="▤" title="Native Intune export" text="Supports ZIP or CSV exports"/></div>{busy&&<div className="loadingState">Reading and normalizing inventory…</div>}{error&&<div className="error">{error}</div>}</section>
      <section className="drop cleanDrop dropPro" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();open(e.dataTransfer.files[0])}} onClick={()=>input.current?.click()}><span className="dropIcon dropCloud">↥</span><strong>Drop your Intune export here</strong><small>or click anywhere in this area to browse files</small><span className="dropFormats">ZIP · CSV</span></section>
      <section className="trustStrip"><Trust icon="♙" title="Your data stays with you" text="All files are read locally. Nothing is sent anywhere, ever."/><Trust icon="✓" title="Works offline" text="After loading your export, analysis remains local to your browser."/><Trust icon="▱" title="Built for real inventories" text="Designed for large Intune exports with thousands of devices."/></section><LandingContent/>
    </main>:<main className="workspace dashboardWorkspace">
      {demoMode&&<div className="demoBanner"><span>Demo inventory</span><strong>You're exploring fictional data.</strong><button onClick={()=>input.current?.click()}>Open your own export</button></div>}
      <section className="pageHead dashboardHead"><div><span className="eyebrow">{view.toUpperCase()}</span><h1>{pageTitle}</h1><p>{pageDescription}</p></div>{view==='overview'?<PlatformSelect value={platform} platforms={platforms} onChange={p=>{setPlatform(p);setFilter(null)}}/>:view!=='reports'?<Search value={query} setValue={setQuery}/>:null}</section>
      {view!=='overview'&&<div className="platformStrip"><button className={!platform?'active':''} onClick={()=>{setPlatform(null);setFilter(null)}}><span>All platforms</span><strong>{data.devices.length.toLocaleString()}</strong></button>{platforms.map(([p,n])=><button key={p} className={platform===p?'active':''} onClick={()=>{setPlatform(platform===p?null:p);setFilter(null)}}><span>{platformLabel[p]}</span><strong>{n.toLocaleString()}</strong></button>)}</div>}
      {(platform||filter)&&view!=='overview'&&<div className="activeFilters"><span>Viewing</span>{platform&&<b>{platformLabel[platform]}</b>}{filter&&<b>{filter.label}: {filter.value}</b>}<span>{scoped.length.toLocaleString()} devices</span><button onClick={()=>{setPlatform(null);setFilter(null)}}>Clear</button></div>}
      {view==='overview'&&<Overview devices={base} allDevices={data.devices} total={base.length} users={users.length} compliant={compliant} noncompliant={noncompliant} grace={grace} stale={stale} compliance={compliance} platforms={platforms} platform={platform} onPlatform={setPlatform} drill={drill}/>} 
      {view==='devices'&&<DataCard title="Device inventory" subtitle={`${searched.length.toLocaleString()} matching devices`}><SmartTable rows={searched} columns={deviceColumns} rowKey={d=>d.id} exportName="intune-devices" onRowClick={setSelected}/></DataCard>}
      {view==='updates'&&<><WindowsUpdateHealth devices={base}/><DataCard title="All reported OS versions" subtitle={`${filteredUpdates.length.toLocaleString()} matching platform/version combinations`}><SmartTable rows={filteredUpdates} columns={updateColumns} rowKey={r=>r.platform+'|'+r.version} exportName="intune-os-versions" onRowClick={r=>drill('osVersion','OS version',r.version)}/></DataCard></>}
      {view==='reports'&&<section className="reportsPlaceholder"><div className="reportsIcon">▤</div><h2>Management reports</h2><p>PDF and PowerPoint reporting will be built here using the currently loaded inventory. The report engine will remain fully local in the browser.</p><span>Planned: executive summary · platform overview · compliance · update position · hardware</span></section>}
    </main>}
    <footer className="siteFooter professionalFooter"><div className="footerBrand"><span className="footerMark">ID</span><div><strong>Intune Device Inventory Analyzer</strong><span>Open-source device inventory analysis for Microsoft Intune.</span></div></div><div className="footerPrivacy"><strong>Private by design</strong><span>Inventory processing happens locally in your browser. No device or user data is uploaded or stored.</span></div><div className="footerMeta"><a href="https://github.com/roryvossepoel/Intune-Device-Inventory-Analyzer" target="_blank" rel="noreferrer">GitHub</a><button onClick={()=>navigate('faq')}>FAQ</button><strong>v0.1.0</strong></div></footer>
    {selected&&<DeviceDetail device={selected} onClose={()=>setSelected(null)}/>} 
  </div>;
}

function Feature({icon,title,text}:{icon:string;title:string;text:string}){return <article className="feature"><span>{