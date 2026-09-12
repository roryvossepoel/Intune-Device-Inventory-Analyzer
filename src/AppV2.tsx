import { useMemo, useRef, useState } from 'react';
import { importInventory } from './importer';
import { createDemoInventory } from './demoData';
import SmartTable from './SmartTable';
import DashboardSections from './DashboardSections';
import DashboardPlatformFilter from './DashboardPlatformFilter';
import HardwareExplorerFilters, { emptyHardwareExplorerFilters, hardwareExplorerFilterMatches } from './HardwareExplorerFilters';
import LandingContent from './LandingContent';
import FaqPage from './FaqPage';
import ReportsPage from './ReportsPage';
import ShareMenu from './ShareMenu';
import MobileNavigation from './MobileNavigation';
import DeviceDetailPanel from './DeviceDetail';
import { describeOsVersion } from './deviceIntelligence';
import { lifecycleRiskSummary } from './lifecycleRisk';
import type { HardwareExplorerFilterState } from './HardwareExplorerFilters';
import type { DeviceTableInitialFilters, SmartColumn } from './SmartTable';
import type { Device, ImportResult } from './types';

const platformLabel:Record<string,string>={windows:'Windows',android:'Android',applemobile:'iOS/iPadOS',macos:'macOS',linux:'Linux',unknown:'Unknown'};
const platformKey=(platform:string)=>platform==='ios'||platform==='ipados'?'applemobile':platform;
const dashboardPlatformLabel=(platform:string)=>platformLabel[platform]||platform;
const key=(value:string|null)=>value?.trim()||'Unknown';
const formatNumber=(value:number)=>value.toLocaleString();
const formatDateTime=(value:string|null)=>{if(!value)return '—';const date=new Date(value);if(Number.isNaN(date.getTime()))return value;return new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(date)};
const daysSince=(value:string|null)=>{if(!value)return null;const time=Date.parse(value);return Number.isFinite(time)?(Date.now()-time)/86400000:null};
const intelligencePlatform=(value:string)=>platformKey(value) as 'windows'|'android'|'applemobile'|'macos'|'linux'|'unknown';
const displayOsVersion=(device:Device)=>describeOsVersion(intelligencePlatform(device.platform),device.osVersion)||(device.osVersion||'');
const countBy=(devices:Device[],selector:(device:Device)=>string)=>Object.entries(devices.reduce<Record<string,number>>((acc,device)=>{const value=selector(device);acc[value]=(acc[value]??0)+1;return acc},{})).sort((a,b)=>b[1]-a[1]) as [string,number][];

type View='overview'|'devices'|'reports'|'faq';
type Filter={field:'compliance'|'osVersion'|'manufacturer'|'model'|'user'|'encryption'|'checkInAge'|'enrollmentAge'|'inventoryQuality'|'deviceType'|'appleDeviceFamily'|'cellularCapability'|'primaryUser'|'userDensity'|'ownership';label:string;value:string}|null;

export default function AppV2(){
  const [data,setData]=useState<ImportResult|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [view,setView]=useState<View>('overview');
  const [query,setQuery]=useState('');
  const [platformsSelected,setPlatformsSelected]=useState<string[]>([]);
  const [filter,setFilter]=useState<Filter>(null);
  const [hardwareFilters,setHardwareFilters]=useState<HardwareExplorerFilterState>(()=>emptyHardwareExplorerFilters());
  const [selected,setSelected]=useState<Device|null>(null);
  const [demoMode,setDemoMode]=useState(false);
  const input=useRef<HTMLInputElement>(null);

  async function open(file?:File){
    if(!file)return;
    setBusy(true);setError(null);
    try{setData(await importInventory(file));setDemoMode(false);setView('overview');setPlatformsSelected([]);setFilter(null);setHardwareFilters(emptyHardwareExplorerFilters());setQuery('')}
    catch(error){setError(error instanceof Error?error.message:'The export could not be read.')}
    finally{setBusy(false)}
  }

  function openDemo(target:View='overview'){
    setData(createDemoInventory());setDemoMode(true);setView(target);setPlatformsSelected([]);setFilter(null);setHardwareFilters(emptyHardwareExplorerFilters());setQuery('');window.scrollTo({top:0,behavior:'smooth'});
  }

  function navigate(target:View){
    if(target==='faq'){setFilter(null);setHardwareFilters(emptyHardwareExplorerFilters());setView('faq');window.scrollTo({top:0,behavior:'smooth'});return}
    if(!data){openDemo(target);return}
    if(target!=='devices'){setFilter(null);setHardwareFilters(emptyHardwareExplorerFilters())}
    setView(target);setQuery('');window.scrollTo({top:0,behavior:'smooth'});
  }

  function goHome(){
    if(data){navigate('overview');return}
    setView('overview');setQuery('');window.scrollTo({top:0,behavior:'smooth'});
  }

  function drill(field:NonNullable<Filter>['field'],label:string,value:string){
    if(field==='deviceType'||field==='appleDeviceFamily'||field==='cellularCapability'){
      setFilter(null);
      setHardwareFilters({
        deviceTypes:field==='deviceType'?[value]:[],
        appleFamilies:field==='appleDeviceFamily'?[value]:[],
        cellularCapabilities:field==='cellularCapability'?[value]:[]
      });
    }else{
      setHardwareFilters(emptyHardwareExplorerFilters());
      setFilter({field,label,value});
    }
    setView('devices');setQuery('');window.scrollTo({top:0,behavior:'smooth'});
  }

  const base=useMemo(()=>data?.devices.filter(device=>!platformsSelected.length||platformsSelected.includes(platformKey(device.platform)))??[],[data,platformsSelected]);
  const platforms=useMemo(()=>data?countBy(data.devices,device=>platformKey(device.platform)):[],[data]);
  const activePlatform=platformsSelected.length===1?platformsSelected[0]:null;
  const compliance=useMemo(()=>countBy(base,device=>key(device.compliance)),[base]);
  const compliant=compliance.find(([value])=>value.toLowerCase()==='compliant')?.[1]??0;
  const noncompliant=compliance.find(([value])=>value.toLowerCase()==='noncompliant')?.[1]??0;
  const grace=compliance.find(([value])=>value.toLowerCase()==='ingraceperiod')?.[1]??0;
  const stale=useMemo(()=>base.filter(device=>{const age=daysSince(device.lastCheckIn);return age!==null&&age>30}).length,[base]);
  const lifecycle=useMemo(()=>lifecycleRiskSummary(base),[base]);
  const q=query.trim().toLowerCase();
  const deviceRows=useMemo(()=>data?.devices.filter(device=>hardwareExplorerFilterMatches(device,hardwareFilters)&&(!q||[device.deviceName,device.serialNumber,device.userDisplayName,device.userUpn,device.manufacturer,device.model,device.osVersion,device.sourceOS].some(value=>value?.toLowerCase().includes(q))))??[],[data,q,hardwareFilters]);

  const deviceInitialFilters=useMemo<DeviceTableInitialFilters>(()=>{
    const initial:DeviceTableInitialFilters={};
    if(platformsSelected.length)initial.platforms=platformsSelected.map(platform=>platformLabel[platform]||platform);
    if(!filter)return initial;
    if(filter.field==='compliance')initial.compliance=filter.value;
    if(filter.field==='osVersion')initial.osVersion=filter.value;
    if(filter.field==='manufacturer')initial.manufacturer=filter.value;
    if(filter.field==='model')initial.model=filter.value;
    if(filter.field==='checkInAge')initial.checkInAge=filter.value;
    if(filter.field==='enrollmentAge')initial.enrollmentAge=filter.value;
    if(filter.field==='inventoryQuality')initial.inventoryQuality=filter.value;
    if(filter.field==='ownership')initial.ownership=filter.value;
    if(filter.field==='primaryUser')initial.primaryUser=filter.value;
    if(filter.field==='userDensity')initial.userDensity=filter.value;
    if(filter.field==='encryption'){
      const value=filter.value.toLowerCase();
      initial.encryption=['false','no','0','not encrypted','unencrypted'].includes(value)?'Not encrypted':['true','yes','1','encrypted'].includes(value)?'Encrypted':'Unknown';
    }
    return initial;
  },[platformsSelected,filter]);

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

  const nav:[Exclude<View,'faq'>,string][]=[['overview','Dashboard'],['devices','Device Explorer'],['reports','Reports']];
  const overviewTitle=activePlatform?`${dashboardPlatformLabel(activePlatform)} dashboard`:'Inventory dashboard';
  const overviewDescription=platformsSelected.length===0
    ?`Health, composition, lifecycle and management insights across ${formatNumber(data?.devices.length??0)} managed devices.`
    :platformsSelected.length===1
      ?`Health, composition, lifecycle and management insights across ${formatNumber(base.length)} ${dashboardPlatformLabel(activePlatform!)} devices.`
      :`Health, composition, lifecycle and management insights across ${formatNumber(base.length)} managed devices in ${platformsSelected.length} selected platforms.`;
  const pageTitle=view==='overview'?overviewTitle:view==='devices'?'Device Explorer':view==='reports'?'Reports':'FAQ';
  const pageDescription=view==='overview'?overviewDescription:view==='devices'?'Search and inspect every device in the imported inventory.':'Turn the current inventory into reusable management stories with the visual evidence beside the conclusion.';

  return <div className="app">
    <header className={`topbar ${!data||view==='faq'?'publicTopbar':''}`}><div className="topbarInner">
      <button className="brand" onClick={goHome}><span className="brandMark">ID</span><span><strong>Intune Device Inventory</strong><small>Analyzer</small></span></button>
      <nav className={`mainNav ${!data?'publicNav':''}`}>{nav.map(([id,label])=><button key={id} className={view===id&&data?'active':''} onClick={()=>navigate(id)}>{label}</button>)}</nav>
      <div className="idaHeaderUtilities">
        <button type="button" className={view==='faq'?'active':''} onClick={()=>navigate('faq')}>FAQ</button>
        <ShareMenu/>
        <a className="idaGithubButton" href="https://github.com/roryvossepoel/Intune-Device-Inventory-Analyzer" target="_blank" rel="noreferrer" aria-label="Open GitHub repository" title="GitHub"><GithubIcon/></a>
      </div>
      <MobileNavigation activeView={view==='faq'?'faq':data?view:'home'} onNavigate={navigate}/>
      {data&&<button className="primarySmall idaHeaderOpen" onClick={()=>input.current?.click()}>Open export</button>}
      <input ref={input} hidden type="file" accept=".zip,.csv" onChange={event=>open(event.target.files?.[0])}/>
    </div></header>

    {view==='faq'?<FaqPage/>:!data?<main className="landing landingPro">
      <LandingContent onOpenExport={()=>input.current?.click()} onOpenDemo={()=>openDemo('overview')} onOpenReports={()=>openDemo('reports')} busy={busy} error={error}/>
    </main>:<main className="workspace dashboardWorkspace">
      {demoMode&&<div className="demoBanner"><span>Demo inventory</span><strong>You're exploring fictional data.</strong><button onClick={()=>input.current?.click()}>Open your own export</button></div>}
      <section className="pageHead dashboardHead"><div>{view!=='overview'&&<span className="eyebrow">{view==='devices'?'DEVICE EXPLORER':view.toUpperCase()}</span>}<h1>{pageTitle}</h1><p>{pageDescription}</p></div>{view==='overview'?<DashboardPlatformFilter platforms={platforms} selected={platformsSelected} onChange={values=>{setPlatformsSelected(values);setFilter(null);setHardwareFilters(emptyHardwareExplorerFilters())}}/>:view==='devices'?<Search value={query} setValue={setQuery}/>:null}</section>
      {view==='overview'&&<Overview devices={base} allDevices={platformsSelected.length?base:data.devices} total={base.length} lifecycle={lifecycle} compliant={compliant} noncompliant={noncompliant} grace={grace} stale={stale} compliance={compliance} platformsSelected={platformsSelected} activePlatform={activePlatform} drill={drill}/>} 
      {view==='devices'&&<DataCard title="Device inventory" subtitle=""><HardwareExplorerFilters devices={data.devices} value={hardwareFilters} onChange={setHardwareFilters}/><SmartTable rows={deviceRows} columns={deviceColumns} rowKey={device=>device.id} exportName="intune-devices" onRowClick={setSelected} initialFilters={deviceInitialFilters} onClearFilters={()=>{setPlatformsSelected([]);setFilter(null);setHardwareFilters(emptyHardwareExplorerFilters())}} searchQuery={query} onClearSearch={()=>setQuery('')}/></DataCard>}
      {view==='reports'&&<ReportsPage devices={data.devices} demoMode={demoMode}/>} 
    </main>}

    <footer className="siteFooter productFooter"><div className="productFooterInner">
      <div className="productFooterGrid">
        <section className="productFooterLead"><div className="productFooterBrand"><span className="footerMark">ID</span><div><strong>Intune Device Inventory Analyzer</strong><span>Inventory insight without another backend.</span></div></div><p>Open-source, local-first analysis for native Microsoft Intune device inventory exports. Move from raw device rows to dashboard insight, device-level investigation and reusable reporting.</p></section>
        <section><h3>Explore</h3><button onClick={()=>navigate('overview')}>Dashboard</button><button onClick={()=>navigate('devices')}>Device Explorer</button><button onClick={()=>navigate('reports')}>Reports</button><button onClick={()=>navigate('faq')}>FAQ</button></section>
        <section><h3>Analyzer</h3><span>Native Intune CSV & ZIP</span><span>Dashboard drill-through</span><span>Original export fields</span><span>Lifecycle intelligence</span><span>Management-ready stories</span></section>
        <section><h3>Project</h3><a href="https://github.com/roryvossepoel/Intune-Device-Inventory-Analyzer" target="_blank" rel="noreferrer">GitHub repository ↗</a><a href="https://intuneinventory.com" rel="noreferrer">intuneinventory.com</a><div className="productFooterPrivacy"><strong>Private by design</strong><span>Inventory processing happens locally in your browser. Device and user data is not uploaded or stored by the Analyzer.</span></div></section>
      </div>
      <div className="productFooterBottom"><span>© 2026 Intune Device Inventory Analyzer · Open source · Provided as-is · Not affiliated with Microsoft</span><span><b>v0.1.0</b> · <a href="https://github.com/roryvossepoel/Intune-Device-Inventory-Analyzer" target="_blank" rel="noreferrer">Source on GitHub</a></span></div>
    </div></footer>
    {selected&&<DeviceDetailPanel device={selected} onClose={()=>setSelected(null)}/>} 
  </div>;
}

function Overview({devices,allDevices,total,lifecycle,compliant,noncompliant,grace,stale,compliance,platformsSelected,activePlatform,drill}:{devices:Device[];allDevices:Device[];total:number;lifecycle:ReturnType<typeof lifecycleRiskSummary>;compliant:number;noncompliant:number;grace:number;stale:number;compliance:[string,number][];platformsSelected:string[];activePlatform:string|null;drill:(field:NonNullable<Filter>['field'],label:string,value:string)=>void}){
  const compliancePct=total?compliant/total*100:0;
  const inactivityPct=total?stale/total*100:0;
  const lifecyclePct=lifecycle.assessed?lifecycle.risk/lifecycle.assessed*100:0;
  const lifecycleNote=lifecycle.assessed===0
    ?'No lifecycle data for this scope'
    :lifecycle.assessed===total
      ?`${lifecyclePct.toFixed(1)}% of current scope`
      :`${lifecyclePct.toFixed(1)}% at risk · ${formatNumber(lifecycle.assessed)} of ${formatNumber(total)} assessed`;
  const lifecycleTone=lifecycle.assessed===0?'neutral':lifecycle.expired>0?'bad':lifecycle.risk>0?'warn':'good';
  return <div className="inventoryDashboard">
    <section className="healthKpis"><HealthKpi icon="devices" label="Managed devices" value={formatNumber(total)} note="Current scope" tone="blue"/><HealthKpi icon="compliance" label="Compliant devices" value={`${compliancePct.toFixed(1)}%`} note={`${formatNumber(compliant)} of ${formatNumber(total)} compliant`} tone={compliancePct>=90?'good':compliancePct>=75?'warn':'bad'}/><HealthKpi icon="lifecycle" label="Lifecycle risk" value={lifecycle.assessed?formatNumber(lifecycle.risk):'—'} note={lifecycleNote} tone={lifecycleTone}/><HealthKpi icon="inactive" label="No check-in for 30+ days" value={formatNumber(stale)} note={`${inactivityPct.toFixed(1)}% of current scope`} tone={stale?'warn':'good'}/></section>
    <DashboardSections devices={devices} allDevices={allDevices} total={total} compliance={compliance} compliant={compliant} noncompliant={noncompliant} grace={grace} stale={stale} platform={activePlatform} drill={drill}/>
  </div>;
}

function HealthKpi({icon,label,value,note,tone}:{icon:'devices'|'compliance'|'lifecycle'|'inactive';label:string;value:string;note:string;tone:string}){return <article className={`healthKpi ${tone}`}><span className={`healthIcon ${icon}`}><KpiIcon name={icon}/></span><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div></article>}
function KpiIcon({name}:{name:'devices'|'compliance'|'lifecycle'|'inactive'}){
  if(name==='devices')return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="4" width="14" height="10.5" rx="1.8"/><path d="M7 19h5m-2.5-4.5V19"/><rect x="16.2" y="8.5" width="5.3" height="11" rx="1.4"/><path d="M18.2 17.3h1.3"/></svg>;
  if(name==='compliance')return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.5 2.9 7.3 7 9 4.1-1.7 7-4.5 7-9V6l-7-3Z"/><path d="m8.4 11.8 2.2 2.2 5-5"/></svg>;
  if(name==='lifecycle')return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6.5"/><path d="M10 6.5V10l2.5 1.7"/><path d="m17.7 13.8 4 6.9h-8l4-6.9Z"/><path d="M17.7 16.5v1.8m0 1.1v.1"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.4 7.1A8 8 0 1 1 4.2 15"/><path d="M4 3.5v4.7h4.7"/><path d="M12 7.2V12l3.2 2"/></svg>;
}
function GithubIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .7a11.5 11.5 0 0 0-3.64 22.41c.58.11.79-.25.79-.56v-2.02c-3.22.7-3.9-1.37-3.9-1.37-.52-1.34-1.29-1.69-1.29-1.69-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.2 1.77 1.2 1.04 1.78 2.72 1.27 3.38.97.1-.75.4-1.27.73-1.56-2.57-.29-5.27-1.29-5.27-5.72 0-1.27.45-2.3 1.19-3.11-.12-.29-.52-1.47.11-3.07 0 0 .97-.31 3.16 1.19a10.96 10.96 0 0 1 5.76 0c2.19-1.5 3.16-1.19 3.16-1.19.63 1.6.23 2.78.11 3.07.74.81 1.19 1.84 1.19 3.11 0 4.44-2.71 5.42-5.29 5.71.42.36.79 1.07.79 2.16v3.2c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z"/></svg>}
function Search({value,setValue}:{value:string;setValue:(value:string)=>void}){return <div className="search"><span className="searchIcon" aria-hidden="true">⌕</span><input value={value} onChange={event=>setValue(event.target.value)} placeholder="Search…"/>{value&&<button type="button" className="searchClear" onClick={()=>setValue('')} aria-label="Clear search"><svg aria-hidden="true" viewBox="0 0 16 16"><path d="m4.5 4.5 7 7M11.5 4.5l-7 7"/></svg></button>}</div>}
function DataCard({title,subtitle,children}:{title:string;subtitle:string;children:React.ReactNode}){return <section className="dataCard"><div className="dataHead"><div><h2>{title}</h2><p>{subtitle}</p></div></div>{children}</section>}
