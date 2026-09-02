import { useMemo, useRef, useState } from 'react';
import { importInventory } from './importer';
import type { Device, ImportResult } from './types';

const platformLabel: Record<string, string> = { windows: 'Windows', android: 'Android', ios: 'iOS', ipados: 'iPadOS', macos: 'macOS', linux: 'Linux', unknown: 'Unknown' };
const key = (value: string | null) => value?.trim() || 'Unknown';
const countBy = (devices: Device[], selector: (d: Device) => string) => Object.entries(devices.reduce<Record<string, number>>((a,d)=>{const k=selector(d);a[k]=(a[k]??0)+1;return a;},{})).sort((a,b)=>b[1]-a[1]);

export default function App() {
  const [data, setData] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function open(file?: File) { if(!file)return; setBusy(true);setError(null);try{setData(await importInventory(file));setPlatform(null);setQuery('');}catch(e){setData(null);setError(e instanceof Error?e.message:'The export could not be read.');}finally{setBusy(false);} }

  const scoped = useMemo(()=>data?.devices.filter(d=>!platform||d.platform===platform)??[],[data,platform]);
  const platformCounts = useMemo(()=>data?countBy(data.devices,d=>d.platform):[],[data]);
  const compliance = useMemo(()=>countBy(scoped,d=>key(d.compliance)),[scoped]);
  const manufacturers = useMemo(()=>countBy(scoped,d=>key(d.manufacturer)).slice(0,7),[scoped]);
  const versions = useMemo(()=>countBy(scoped,d=>key(d.osVersion)).slice(0,7),[scoped]);
  const ownership = useMemo(()=>countBy(scoped,d=>key(d.ownership)),[scoped]);
  const managed = useMemo(()=>countBy(scoped,d=>key(d.managedBy)).slice(0,6),[scoped]);
  const filtered = useMemo(()=>{const q=query.trim().toLowerCase();return scoped.filter(d=>!q||[d.deviceName,d.serialNumber,d.userDisplayName,d.userUpn,d.manufacturer,d.model,d.osVersion].some(v=>v?.toLowerCase().includes(q)));},[scoped,query]);
  const compliantCount = compliance.find(([k])=>k.toLowerCase()==='compliant')?.[1]??0;

  return <main>
    <header><div><span className="eyebrow">LOCAL ANALYSIS</span><h1>Intune Device Inventory Analyzer</h1><p>Turn a native Intune device inventory export into useful, explorable information.</p></div><div className="privacy">● Your inventory stays in this browser</div></header>
    {!data && <section className="drop" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();open(e.dataTransfer.files[0]);}}><div className="fileIcon">ZIP</div><h2>Open an Intune inventory export</h2><p>Select the ZIP downloaded directly from Intune. CSV files are supported too.</p><button onClick={()=>input.current?.click()} disabled={busy}>{busy?'Reading export…':'Select export'}</button><input ref={input} hidden type="file" accept=".zip,.csv" onChange={e=>open(e.target.files?.[0])}/><small>No device or user information is uploaded to a server.</small>{error&&<div className="error">{error}</div>}</section>}
    {data&&<>
      <section className="source"><div><strong>{data.sourceFileName}</strong><span>{data.devices.length.toLocaleString()} devices · {data.columns.length} source columns</span></div><button className="secondary" onClick={()=>setData(null)}>Open another export</button></section>
      <nav className="tabs"><button className="active">Dashboard</button><button onClick={()=>document.getElementById('devices')?.scrollIntoView({behavior:'smooth'})}>Devices</button><button disabled>Users <small>soon</small></button><button disabled>Hardware <small>soon</small></button><button disabled>Updates <small>soon</small></button><button disabled>Reports <small>soon</small></button></nav>
      <section className="cards"><article className={!platform?'selected':''} onClick={()=>setPlatform(null)}><span>Total devices</span><strong>{data.devices.length.toLocaleString()}</strong><small>All platforms</small></article>{platformCounts.map(([p,n])=><article key={p} className={platform===p?'selected':''} onClick={()=>setPlatform(platform===p?null:p)}><span>{platformLabel[p]??p}</span><strong>{n.toLocaleString()}</strong><small>{((n/data.devices.length)*100).toFixed(1)}% of inventory</small></article>)}</section>
      {platform&&<div className="filterBar"><span>Filtered to <strong>{platformLabel[platform]}</strong> · {scoped.length.toLocaleString()} devices</span><button onClick={()=>setPlatform(null)}>Clear filter ×</button></div>}
      <section className="dashboardGrid">
        <article className="panel compliancePanel"><div className="panelHead"><div><h2>Compliance</h2><p>Current device compliance state</p></div><strong className="metric">{scoped.length?((compliantCount/scoped.length)*100).toFixed(1):'0'}%</strong></div><BarList items={compliance} total={scoped.length}/></article>
        <article className="panel"><div className="panelHead"><div><h2>OS versions</h2><p>Most common reported versions</p></div></div><BarList items={versions} total={scoped.length}/></article>
        <article className="panel"><div className="panelHead"><div><h2>Manufacturers</h2><p>Largest hardware vendors</p></div></div><BarList items={manufacturers} total={scoped.length}/></article>
        <article className="panel"><div className="panelHead"><div><h2>Ownership</h2><p>Corporate and personal devices</p></div></div><BarList items={ownership} total={scoped.length}/></article>
        <article className="panel wide"><div className="panelHead"><div><h2>Management</h2><p>How devices are managed in Intune</p></div></div><BarList items={managed} total={scoped.length}/></article>
      </section>
      <section className="explorer" id="devices"><div className="explorerHead"><div><h2>Device explorer</h2><p>{platform?`${platformLabel[platform]} devices`:'All imported devices'} · searchable technical inventory</p></div><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search device, user, serial, model…" /></div><div className="tableWrap"><table><thead><tr><th>Device</th><th>Platform</th><th>OS version</th><th>Manufacturer / model</th><th>Primary user</th><th>Compliance</th><th>Last check-in</th></tr></thead><tbody>{filtered.slice(0,250).map(d=><tr key={d.id}><td><strong>{d.deviceName??'—'}</strong><small>{d.serialNumber??''}</small></td><td><span className="pill">{platformLabel[d.platform]}</span></td><td>{d.osVersion??'—'}</td><td>{[d.manufacturer,d.model].filter(Boolean).join(' · ')||'—'}</td><td>{d.userDisplayName??d.userUpn??'—'}</td><td>{d.compliance??'—'}</td><td>{d.lastCheckIn??'—'}</td></tr>)}</tbody></table></div><div className="tableFoot">Showing {Math.min(filtered.length,250).toLocaleString()} of {filtered.length.toLocaleString()} matching devices{filtered.length>250?' · first 250 rows shown':''}</div></section>
    </>}
    <footer>Intune Device Inventory Analyzer · Inventory processing is performed locally in your browser.</footer>
  </main>;
}

function BarList({items,total}:{items:[string,number][],total:number}){return <div className="barList">{items.map(([label,n])=><div className="barRow" key={label}><div className="barMeta"><span title={label}>{label}</span><strong>{n.toLocaleString()}</strong></div><div className="barTrack"><i style={{width:`${total?(n/total)*100:0}%`}}/></div><small>{total?((n/total)*100).toFixed(1):'0'}%</small></div>)}</div>;}