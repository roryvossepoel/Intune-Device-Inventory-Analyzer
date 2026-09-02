import { useMemo, useRef, useState } from 'react';
import { importInventory } from './importer';
import type { Device, ImportResult } from './types';

const platformLabel: Record<string, string> = { windows: 'Windows', android: 'Android', ios: 'iOS', ipados: 'iPadOS', macos: 'macOS', linux: 'Linux', unknown: 'Unknown' };
const key = (value: string | null) => value?.trim() || 'Unknown';
const countBy = (devices: Device[], selector: (d: Device) => string) => Object.entries(devices.reduce<Record<string, number>>((a,d)=>{const k=selector(d);a[k]=(a[k]??0)+1;return a;},{})).sort((a,b)=>b[1]-a[1]);
type DrillField = 'compliance'|'osVersion'|'manufacturer'|'ownership'|'managedBy';
type Drill = { field: DrillField; label: string; value: string } | null;

export default function App() {
  const [data, setData] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState<string | null>(null);
  const [drill, setDrill] = useState<Drill>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function open(file?: File) { if(!file)return; setBusy(true);setError(null);try{setData(await importInventory(file));setPlatform(null);setDrill(null);setQuery('');}catch(e){setData(null);setError(e instanceof Error?e.message:'The export could not be read.');}finally{setBusy(false);} }
  function choosePlatform(value: string | null){ setPlatform(value); setDrill(null); setQuery(''); }
  function applyDrill(field: DrillField,label: string,value: string){ setDrill({field,label,value}); setQuery(''); requestAnimationFrame(()=>document.getElementById('devices')?.scrollIntoView({behavior:'smooth'})); }

  const platformScoped = useMemo(()=>data?.devices.filter(d=>!platform||d.platform===platform)??[],[data,platform]);
  const scoped = useMemo(()=>platformScoped.filter(d=>{
    if(!drill)return true;
    const raw = drill.field==='compliance'?d.compliance:drill.field==='osVersion'?d.osVersion:drill.field==='manufacturer'?d.manufacturer:drill.field==='ownership'?d.ownership:d.managedBy;
    return key(raw)===drill.value;
  }),[platformScoped,drill]);
  const platformCounts = useMemo(()=>data?countBy(data.devices,d=>d.platform):[],[data]);
  const compliance = useMemo(()=>countBy(platformScoped,d=>key(d.compliance)),[platformScoped]);
  const manufacturers = useMemo(()=>countBy(platformScoped,d=>key(d.manufacturer)).slice(0,7),[platformScoped]);
  const versions = useMemo(()=>countBy(platformScoped,d=>key(d.osVersion)).slice(0,7),[platformScoped]);
  const ownership = useMemo(()=>countBy(platformScoped,d=>key(d.ownership)),[platformScoped]);
  const managed = useMemo(()=>countBy(platformScoped,d=>key(d.managedBy)).slice(0,6),[platformScoped]);
  const filtered = useMemo(()=>{const q=query.trim().toLowerCase();return scoped.filter(d=>!q||[d.deviceName,d.serialNumber,d.userDisplayName,d.userUpn,d.manufacturer,d.model,d.osVersion].some(v=>v?.toLowerCase().includes(q)));},[scoped,query]);
  const compliantCount = compliance.find(([k])=>k.toLowerCase()==='compliant')?.[1]??0;

  return <main>
    <header><div><span className="eyebrow">LOCAL ANALYSIS</span><h1>Intune Device Inventory Analyzer</h1><p>Turn a native Intune device inventory export into useful, explorable information.</p></div><div className="privacy">● Your inventory stays in this browser</div></header>
    {!data && <section className="drop" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();open(e.dataTransfer.files[0]);}}><div className="fileIcon">ZIP</div><h2>Open an Intune inventory export</h2><p>Select the ZIP downloaded directly from Intune. CSV files are supported too.</p><button onClick={()=>input.current?.click()} disabled={busy}>{busy?'Reading export…':'Select export'}</button><input ref={input} hidden type="file" accept=".zip,.csv" onChange={e=>open(e.target.files?.[0])}/><small>No device or user information is uploaded to a server.</small>{error&&<div className="error">{error}</div>}</section>}
    {data&&<>
      <section className="source"><div><strong>{data.sourceFileName}</strong><span>{data.devices.length.toLocaleString()} devices · {data.columns.length} source columns</span></div><button className="secondary" onClick={()=>setData(null)}>Open another export</button></section>
      <nav className="tabs"><button className="active">Dashboard</button><button onClick={()=>document.getElementById('devices')?.scrollIntoView({behavior:'smooth'})}>Devices</button><button disabled>Users <small>soon</small></button><button disabled>Hardware <small>soon</small></button><button disabled>Updates <small>soon</small></button><button disabled>Reports <small>soon</small></button></nav>
      <section className="cards"><article className={!platform?'selected':''} onClick={()=>choosePlatform(null)}><span>Total devices</span><strong>{data.devices.length.toLocaleString()}</strong><small>All platforms</small></article>{platformCounts.map(([p,n])=><article key={p} className={platform===p?'selected':''} onClick={()=>choosePlatform(platform===p?null:p)}><span>{platformLabel[p]??p}</span><strong>{n.toLocaleString()}</strong><small>{((n/data.devices.length)*100).toFixed(1)}% of inventory</small></article>)}</section>
      {(platform||drill)&&<div className="filterBar"><div className="filterChips">{platform&&<span className="filterChip">Platform: <strong>{platformLabel[platform]}</strong></span>}{drill&&<span className="filterChip">{drill.label}: <strong>{drill.value}</strong></span>}<span>{scoped.length.toLocaleString()} matching devices</span></div><button onClick={()=>{setPlatform(null);setDrill(null);}}>Clear filters ×</button></div>}
      <section className="dashboardGrid">
        <article className="panel compliancePanel"><div className="panelHead"><div><h2>Compliance</h2><p>Click a state to inspect matching devices</p></div><strong className="metric">{platformScoped.length?((compliantCount/platformScoped.length)*100).toFixed(1):'0'}%</strong></div><BarList items={compliance} total={platformScoped.length} active={drill?.field==='compliance'?drill.value:null} onSelect={v=>applyDrill('compliance','Compliance',v)}/></article>
        <article className="panel"><div className="panelHead"><div><h2>OS versions</h2><p>Click a version to drill down</p></div></div><BarList items={versions} total={platformScoped.length} active={drill?.field==='osVersion'?drill.value:null} onSelect={v=>applyDrill('osVersion','OS version',v)}/></article>
        <article className="panel"><div className="panelHead"><div><h2>Manufacturers</h2><p>Click a vendor to inspect its devices</p></div></div><BarList items={manufacturers} total={platformScoped.length} active={drill?.field==='manufacturer'?drill.value:null} onSelect={v=>applyDrill('manufacturer','Manufacturer',v)}/></article>
        <article className="panel"><div className="panelHead"><div><h2>Ownership</h2><p>Corporate and personal devices</p></div></div><BarList items={ownership} total={platformScoped.length} active={drill?.field==='ownership'?drill.value:null} onSelect={v=>applyDrill('ownership','Ownership',v)}/></article>
        <article className="panel wide"><div className="panelHead"><div><h2>Management</h2><p>Click a management type to drill down</p></div></div><BarList items={managed} total={platformScoped.length} active={drill?.field==='managedBy'?drill.value:null} onSelect={v=>applyDrill('managedBy','Managed by',v)}/></article>
      </section>
      <section className="explorer" id="devices"><div className="explorerHead"><div><h2>Device explorer</h2><p>{drill?`${drill.label}: ${drill.value}`:platform?`${platformLabel[platform]} devices`:'All imported devices'} · click a device for details</p></div><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search device, user, serial, model…" /></div><div className="tableWrap"><table><thead><tr><th>Device</th><th>Platform</th><th>OS version</th><th>Manufacturer / model</th><th>Primary user</th><th>Compliance</th><th>Last check-in</th></tr></thead><tbody>{filtered.slice(0,250).map(d=><tr key={d.id} className="deviceRow" onClick={()=>setSelectedDevice(d)}><td><strong>{d.deviceName??'—'}</strong><small>{d.serialNumber??''}</small></td><td><span className="pill">{platformLabel[d.platform]}</span></td><td>{d.osVersion??'—'}</td><td>{[d.manufacturer,d.model].filter(Boolean).join(' · ')||'—'}</td><td>{d.userDisplayName??d.userUpn??'—'}</td><td>{d.compliance??'—'}</td><td>{d.lastCheckIn??'—'}</td></tr>)}</tbody></table></div><div className="tableFoot">Showing {Math.min(filtered.length,250).toLocaleString()} of {filtered.length.toLocaleString()} matching devices{filtered.length>250?' · first 250 rows shown':''}</div></section>
    </>}
    <footer>Intune Device Inventory Analyzer · Inventory processing is performed locally in your browser.</footer>
    {selectedDevice&&<DeviceDetail device={selectedDevice} onClose={()=>setSelectedDevice(null)}/>} 
  </main>;
}

function BarList({items,total,onSelect,active}:{items:[string,number][],total:number,onSelect:(value:string)=>void,active:string|null}){return <div className="barList">{items.map(([label,n])=><button className={`barRow ${active===label?'active':''}`} key={label} onClick={()=>onSelect(label)}><div className="barMeta"><span title={label}>{label}</span><strong>{n.toLocaleString()}</strong></div><div className="barTrack"><i style={{width:`${total?(n/total)*100:0}%`}}/></div><small>{total?((n/total)*100).toFixed(1):'0'}%</small></button>)}</div>;}

function DeviceDetail({device,onClose}:{device:Device,onClose:()=>void}){
  const groups = groupRaw(device.raw);
  return <div className="detailBackdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><aside className="detailPanel"><div className="detailTop"><button className="backButton" onClick={onClose}>← Back</button><span className="pill">{platformLabel[device.platform]}</span></div><div className="detailHero"><div><span className="eyebrow">DEVICE DETAIL</span><h2>{device.deviceName??'Unnamed device'}</h2><p>{[device.manufacturer,device.model].filter(Boolean).join(' · ')||'Unknown hardware'}</p></div><span className="statusBadge">{device.compliance??'Unknown'}</span></div><section className="detailGrid"><Info title="Identity" items={[['Device ID',device.id],['Serial number',device.serialNumber],['Primary user',device.userDisplayName],['User UPN',device.userUpn]]}/><Info title="Operating system" items={[['Platform',platformLabel[device.platform]],['Source OS',device.sourceOS],['OS version',device.osVersion]]}/><Info title="Management" items={[['Managed by',device.managedBy],['Ownership',device.ownership],['Compliance',device.compliance],['Last check-in',device.lastCheckIn]]}/><Info title="Hardware" items={[['Manufacturer',device.manufacturer],['Model',device.model]]}/></section><div className="rawHeader"><div><h3>Raw Intune data</h3><p>Original source values, grouped for technical inspection.</p></div><span>{Object.keys(device.raw).length} fields</span></div>{Object.entries(groups).map(([name,entries])=><details key={name} open={name==='Device & management'}><summary>{name}<span>{entries.length}</span></summary><div className="rawGrid">{entries.map(([k,v])=><div className="rawItem" key={k}><span>{k}</span><strong>{v||'—'}</strong></div>)}</div></details>)}</aside></div>;
}

function Info({title,items}:{title:string,items:[string,string|null][]}){return <article className="infoCard"><h3>{title}</h3>{items.map(([label,value])=><div className="infoRow" key={label}><span>{label}</span><strong>{value||'—'}</strong></div>)}</article>}

function groupRaw(raw:Record<string,string>){
  const result:Record<string,[string,string][]>= {'Device & management':[],'User':[],'Hardware':[],'Operating system':[],'Security':[],'Storage & network':[],'Other':[]};
  for(const entry of Object.entries(raw)){
    const name=entry[0].toLowerCase();
    let group='Other';
    if(/user|email|upn/.test(name))group='User';
    else if(/manufacturer|model|serial|processor|tpm|bios|architecture|physical|memory/.test(name))group='Hardware';
    else if(/os|operating|version|build|edition|sku/.test(name))group='Operating system';
    else if(/compliance|encrypt|secure|defender|firewall|password|threat/.test(name))group='Security';
    else if(/storage|disk|wifi|wi-fi|ethernet|ip address|mac address|imei|meid|phone|network|subscriber/.test(name))group='Storage & network';
    else if(/device|managed|management|enroll|ownership|join|check-in|last sync|intune|azure|entra/.test(name))group='Device & management';
    result[group].push(entry);
  }
  return Object.fromEntries(Object.entries(result).filter(([,entries])=>entries.length));
}