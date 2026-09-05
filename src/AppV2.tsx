import { useMemo, useRef, useState } from 'react';
import { importInventory } from './importer';
import { createDemoInventory } from './demoData';
import SmartTable from './SmartTable';
import DashboardSections from './DashboardSections';
import DashboardPlatformFilter from './DashboardPlatformFilter';
import LandingContent from './LandingContent';
import FaqPage from './FaqPage';
import DeviceDetailPanel from './DeviceDetail';
import { describeOsVersion } from './deviceIntelligence';
import type { DeviceTableInitialFilters, SmartColumn } from './SmartTable';
import type { Device, ImportResult } from './types';

const platformLabel:Record<string,string>={windows:'Windows',android:'Android',applemobile:'iOS/iPadOS',macos:'macOS',linux:'Linux',unknown:'Unknown'};
const platformKey=(platform:string)=>platform==='ios'||platform==='ipados'?'applemobile':platform;
const dashboardPlatformLabel=(platform:string)=>platformLabel[platform]||platform;
const key=(value:string|null)=>value?.trim()||'Unknown';
const formatNumber=(value:number)=>value.toLocaleString();
const formatDateTime=(value:string|null)=>{if(!value)return '—';const date=new Date(value);if(Number.isNaN(date.getTime()))return value;return new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(date)};
const daysSince=(value:string|null)=>{if(!value)return null;const time=Date.parse(value);return Number.isFinite(time)?(Date.now()-time)/86400000:null};
const rawValue=(device:Device,pattern:RegExp)=>Object.entries(device.raw).find(([name])=>pattern.test(name))?.[1]?.trim()||'';
const intelligencePlatform=(value:string)=>platformKey(value) as 'windows'|'android'|'applemobile'|'macos'|'linux'|'unknown';
const displayOsVersion=(device:Device)=>describeOsVersion(intelligencePlatform(device.platform),device.osVersion)||(device.osVersion||'');
const countBy=(devices:Device[],selector:(device:Device)=>string)=>Object.entries(devices.reduce<Record<string,number>>((acc,device)=>{const value=selector(device);acc[value]=(acc[value]??0)+1;return acc},{})).sort((a,b)=>b[1]-a[1]) as [string,number][];

type View='overview'|'devices'|'reports'|'faq';
type Filter={field:'compliance'|'osVersion'|'manufacturer'|'model'|'user'|'encryption';label:string;value:string}|null;
type UserRow={name:string;upn:string;devices:Device[]};

export default function AppV2(){
  const [data,setData]=useState<ImportResult|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [view,setView]=useState<View>('overview');
  const [query,setQuery]=useState('');
  const [platformsSelected,setPlatformsSelected]=useState<string[]>([]);
  const [filter,setFilter]=useState<Filter>(null);
  const [selected,setSelected]=useState<Device|null>(null);
  const [demoMode,setDemoMode]=useState(false);
  const input=useRef<HTMLInputElement>(null);

  async function open(file?:File){
    if(!file)return;
    setBusy(true);setError(null);
    try{setData(await importInventory(file));setDemoMode(false);setView('overview');setPlatformsSelected([]);setFilter(null);setQuery('')}
    catch(error){setError(error instanceof Error?error.message:'The export could not be read.')}
    finally{setBusy(false)}
  }

  function openDemo(target:View='overview'){
    setData(createDemoInventory());setDemoMode(true);setView(target);setPlatformsSelected([]);setFilter(null);setQuery('');window.scrollTo({top:0,behavior:'smooth'});
  }

  function navigate(target:View){
    if(target==='faq'){setView('faq');window.scrollTo({top:0,behavior:'smooth'});return}
    if(!data){openDemo(target);return}
    setView(target);setQuery('');window.scrollTo({top:0,behavior:'smooth'});
  }

  function drill(field:NonNullable<Filter>['field'],label:string,value:string){
    setFilter({field,label,value});setView('devices');setQuery('');window.scrollTo({top:0,behavior:'smooth'});
  }

  const base=useMemo(()=>data?.devices.filter(device=>!platformsSelected.length||platformsSelected.includes(platformKey(device.platform)))??[],[data,platformsSelected]);
  const platforms=useMemo(()=>data?countBy(data.devices,device=>platformKey(device.platform)):[],[data]);
  const activePlatform=platformsSelected.length===1?platformsSelected[0]:null;
  const compliance=useMemo(()=>countBy(base,device=>key(device.compliance)),[base]);
  const compliant=compliance.find(([value])=>value.toLowerCase()==='compliant')?.[1]??0;
  const noncompliant=compliance.find(([value])=>value.toLowerCase()==='noncompliant')?.[1]??0;
  const grace=compliance.find(([value])=>value.toLowerCase()==='ingraceperiod')?.[1]??0;
  const stale=useMemo(()=>base.filter(device=>{const age=daysSince(device.lastCheckIn);return age!==null&&age>30}).length,[base]);
  const users=useMemo<UserRow[]>(()=>{const map=new Map<string,UserRow>();for(const device of base){const id=key(device.userUpn||device.userDisplayName);if(id==='Unknown')continue;const item=map.get(id)??{name:device.userDisplayName||id,upn:device.userUpn||'',devices:[]};item.devices.push(device);map.set(id,item)}return [...map.values()]},[base]);
  const q=query.trim().toLowerCase();
  const deviceRows=useMemo(()=>data?.devices.filter(device=>!q||[device.deviceName,device.serialNumber,device.userDisplayName,device.userUpn,device.manufacturer,device.model,device.osVersion,device.sourceOS].some(value=>value?.toLowerCase().includes(q)))??[],[data,q]);

  const deviceInitialFilters=useMemo<DeviceTableInitialFilters>(()=>{
    const initial:DeviceTableInitialFilters={};
    if(activePlatform)initial.platform=platformLabel[activePlatform]||activePlatform;
    if(!filter)return initial;
    if(filter.field==='compliance')initial.compliance=filter.value;
    if(filter.field==='osVersion')initial.osVersion=filter.value;
    if(filter.field==='manufacturer')initial.manufacturer=filter.value;
    if(filter.field==='model')initial.model=filter.value;
    if(filter.field==='encryption'){
      const value=filter.value.toLowerCase();
      initial.encryption=['false','no','0','not encrypted','unencrypted'].includes(value)?'Not encrypted':['true','yes','1','encrypted'].includes(value)?'Encrypted':'Unknown';
    }
    return initial;
  },[activePlatform,filter]);

  const deviceColumns:SmartColumn<Device>[]=[
    {key:'device',label:'Device',value:d=>d.deviceName||'',render:d=><><strong>{d.deviceName||'—'}</strong><small>{d.serialNumber}</small></>},
    {key:'platform',label:'Platform',value:d=>platformLabel[platformKey(d.platform)]||d.platform,render:d=><span className="tag">{platformLabel[platformKey(d.platform)]||d.platform}</span>},
    {key:'os',label:'OS version',value:d=>displayOsVersion(d)},
    {key:'manufacturer',label:'Manufacturer',value:d=>d.manufacturer||''},
    {key:'model',label:'Model',value:d=>d.model||''},
    {key:'user',label:'Primary user',value:d=>d.userDisplayName||d.userUpn||''},
    {key:'compliance',label:'Compliance',value:d=>d.compliance||''},
    {key:'checkin',label:'Last check-in',value:d=>d.lastCheckIn||'',render:d=><time dateTime={d.lastCheckIn||undefined} title={d.lastCheckIn||undefined}>{formatDateTime(d.lastCheckIn)}</time>}
  ];

  const nav:[View,string][]=[['overview','Overview'],['devices','Devices'],['reports','Reports'],['faq','FAQ']];
  const overviewTitle=activePlatform?`${dashboardPlatformLabel(activePlatform)} dashboard`:'Inventory dashboard';
  const overviewDescription=platformsSelected.length===0
    ?`Health, composition, lifecycle and management insights across ${formatNumber(data?.devices.length??0)} managed devices.`
    :platformsSelected.length===1
      ?`Health, composition, lifecycle and management insights across ${formatNumber(base.length)} ${dashboardPlatformLabel(activePlatform!)} devices.`
      :`Health, composition, lifecycle and management insights across ${formatNumber(base.length)} managed devices in ${platformsSelected.length} selected platforms.`;
  const pageTitle=view==='overview'?overviewTitle:view==='devices'?'Devices':view==='reports'?'Reports':'FAQ';
  const pageDescription=view==='overview'?overviewDescription:view==='devices'?'Search and inspect every device in the imported inventory.':'Prepare management-ready exports and summaries from the current inventory.';

  return <div className="app">
    <header className={`topbar ${!data||view==='faq'?'publicTopbar':''}`}><div className="topbarInner">
      <button className="brand" onClick={()=>data?navigate('overview'):window.scrollTo({top:0,behavior:'smooth'})}><span className="brandMark">ID</span><span><strong>Intune Device Inventory</strong><small>Analyzer</small></span></button>
      <nav className={`mainNav ${!data?'publicNav':''}`}>{nav.map(([id,label])=><button key={id} className={view===id&&data?'active':''} onClick={()=>navigate(id)}>{label}</button>)}</nav>
      <div className="topActions landingActions"><button className="primarySmall" onClick={()=>input.current?.click()}>Open export</button></div>
      <input ref={input} hidden type="file" accept=".zip,.csv" onChange={event=>open(event.target.files?.[0])}/>
    </div></header>

    {view==='faq'?<FaqPage/>:!data?<main className="landing landingPro">
      <section className="hero heroPro"><div className="heroBadge">◇ 100% PRIVATE BY DESIGN</div><h1>Understand your<br/>Intune device <em>inventory.</em></h1><p>Open a native Microsoft Intune inventory export and turn raw device data into a clear, interactive overview. Everything is processed locally in your browser.</p><div className="landingCtas"><button className="landingPrimary" onClick={()=>input.current?.click()}>↥ Open Intune export</button><button className="landingSecondary" onClick={()=>openDemo('overview')}>Try with demo data →</button></div><small className="demoHint">No export available? Explore the complete experience with a local, fictional demo inventory.</small><div className="featureGrid"><Feature icon="◇" title="100% local" text="Your data never leaves this browser"/><Feature icon="▣" title="Private by design" text="No uploads, no servers, no tracking"/><Feature icon="ϟ" title="Fast & secure" text="All processing happens on your device"/><Feature icon="▤" title="Native Intune export" text="Supports ZIP or CSV exports"/></div>{busy&&<div className="loadingState">Reading and normalizing inventory…</div>}{error&&<div className="error">{error}</div>}</section>
      <section className="drop cleanDrop dropPro" onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();open(event.dataTransfer.files[0])}} onClick={()=>input.current?.click()}><span className="dropIcon dropCloud">↥</span><strong>Drop your Intune export here</strong><small>or click anywhere in this area to browse files</small><span className="dropFormats">ZIP · CSV</span></section>
      <section className="trustStrip"><Trust icon="♙" title="Your data stays with you" text="All files are read locally. Nothing is sent anywhere, ever."/><Trust icon="✓" title="Works offline" text="After loading your export, analysis remains local to your browser."/><Trust icon="▱" title="Built for real inventories" text="Designed for large Intune exports with thousands of devices."/></section>
      <LandingContent/>
    </main>:<main className="workspace dashboardWorkspace">
      {demoMode&&<div className="demoBanner"><span>Demo inventory</span><strong>You're exploring fictional data.</strong><button onClick={()=>input.current?.click()}>Open your own export</button></div>}
      <section className="pageHead dashboardHead"><div>{view!=='overview'&&<span className="eyebrow">{view.toUpperCase()}</span>}<h1>{pageTitle}</h1><p>{pageDescription}</p></div>{view==='overview'?<DashboardPlatformFilter platforms={platforms} selected={platformsSelected} onChange={values=>{setPlatformsSelected(values);setFilter(null)}}/>:view==='devices'?<Search value={query} setValue={setQuery}/>:null}</section>
      {view==='overview'&&<Overview devices={base} allDevices={platformsSelected.length?base:data.devices} total={base.length} users={users.length} compliant={compliant} noncompliant={noncompliant} grace={grace} stale={stale} compliance={compliance} platformsSelected={platformsSelected} activePlatform={activePlatform} drill={drill}/>} 
      {view==='devices'&&<DataCard title="Device inventory" subtitle=""><SmartTable rows={deviceRows} columns={deviceColumns} rowKey={device=>device.id} exportName="intune-devices" onRowClick={setSelected} initialFilters={deviceInitialFilters} onClearFilters={()=>{setPlatformsSelected([]);setFilter(null)}} searchQuery={query} onClearSearch={()=>setQuery('')}/></DataCard>}
      {view==='reports'&&<section className="reportsPlaceholder"><div className="reportsIcon">▤</div><h2>Management reports</h2><p>PDF and PowerPoint reporting will be built here using the currently loaded inventory. The report engine will remain fully local in the browser.</p><span>Planned: executive summary · platform overview · compliance · lifecycle · hardware</span></section>}
    </main>}

    <footer className="siteFooter professionalFooter"><div className="footerBrand"><span className="footerMark">ID</span><div><strong>Intune Device Inventory Analyzer</strong><span>Open-source device inventory analysis for Microsoft Intune.</span></div></div><div className="footerPrivacy"><strong>Private by design</strong><span>Inventory processing happens locally in your browser. No device or user data is uploaded or stored.</span></div><div className="footerMeta"><a href="https://github.com/roryvossepoel/Intune-Device-Inventory-Analyzer" target="_blank" rel="noreferrer">GitHub</a><button onClick={()=>navigate('faq')}>FAQ</button><strong>v0.1.0</strong></div></footer>
    {selected&&<DeviceDetailPanel device={selected} onClose={()=>setSelected(null)}/>} 
  </div>;
}

function Overview({devices,allDevices,total,users,compliant,noncompliant,grace,stale,compliance,platformsSelected,activePlatform,drill}:{devices:Device[];allDevices:Device[];total:number;users:number;compliant:number;noncompliant:number;grace:number;stale:number;compliance:[string,number][];platformsSelected:string[];activePlatform:string|null;drill:(field:NonNullable<Filter>['field'],label:string,value:string)=>void}){
  const compliancePct=total?compliant/total*100:0;
  const inventoryNote=platformsSelected.length===0?'Current inventory':platformsSelected.length===1?`${dashboardPlatformLabel(activePlatform!)} inventory`:`${platformsSelected.length} platforms selected`;
  return <div className="inventoryDashboard">
    <section className="healthKpis"><HealthKpi icon="devices" label="Managed devices" value={formatNumber(total)} note={inventoryNote} tone="blue"/><HealthKpi icon="users" label="Assigned users" value={formatNumber(users)} note={users?`${(total/users).toFixed(1)} devices per assigned user`:'No assigned users'} tone="neutral"/><HealthKpi icon="shield" label="Compliant devices" value={`${compliancePct.toFixed(1)}%`} note={`${formatNumber(compliant)} compliant`} tone={compliancePct>=90?'good':compliancePct>=75?'warn':'bad'}/><HealthKpi icon="clock" label="Inactive over 30 days" value={formatNumber(stale)} note={stale?'Needs review':'All devices recently active'} tone={stale?'warn':'good'}/></section>
    <DashboardSections devices={devices} allDevices={allDevices} total={total} compliance={compliance} compliant={compliant} noncompliant={noncompliant} grace={grace} stale={stale} platform={activePlatform} drill={drill}/>
  </div>;
}

function Feature({icon,title,text}:{icon:string;title:string;text:string}){return <article className="feature"><span>{icon}</span><div><strong>{title}</strong><small>{text}</small></div></article>}
function Trust({icon,title,text}:{icon:string;title:string;text:string}){return <article className="trustItem"><span>{icon}</span><div><strong>{title}</strong><small>{text}</small></div></article>}
function HealthKpi({icon,label,value,note,tone}:{icon:string;label:string;value:string;note:string;tone:string}){return <article className={`healthKpi ${tone}`}><span className={`healthIcon ${icon}`}/><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></article>}
function Search({value,setValue}:{value:string;setValue:(value:string)=>void}){return <div className="search"><span className="searchIcon" aria-hidden="true">⌕</span><input value={value} onChange={event=>setValue(event.target.value)} placeholder="Search…"/>{value&&<button type="button" className="searchClear" onClick={()=>setValue('')} aria-label="Clear search"><svg aria-hidden="true" viewBox="0 0 16 16"><path d="m4.5 4.5 7 7M11.5 4.5l-7 7"/></svg></button>}</div>}
function DataCard({title,subtitle,children}:{title:string;subtitle:string;children:React.ReactNode}){return <section className="dataCard"><div className="dataHead"><div><h2>{title}</h2><p>{subtitle}</p></div></div>{children}</section>}