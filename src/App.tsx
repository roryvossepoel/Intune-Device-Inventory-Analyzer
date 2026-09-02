import { useMemo, useRef, useState } from 'react';
import { importInventory } from './importer';
import type { ImportResult } from './types';

const platformLabel: Record<string, string> = { windows: 'Windows', android: 'Android', ios: 'iOS', ipados: 'iPadOS', macos: 'macOS', linux: 'Linux', unknown: 'Unknown' };

export default function App() {
  const [data, setData] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const input = useRef<HTMLInputElement>(null);

  async function open(file?: File) {
    if (!file) return;
    setBusy(true); setError(null);
    try { setData(await importInventory(file)); }
    catch (e) { setData(null); setError(e instanceof Error ? e.message : 'The export could not be read.'); }
    finally { setBusy(false); }
  }

  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    data?.devices.forEach(d => counts[d.platform] = (counts[d.platform] ?? 0) + 1);
    return counts;
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.devices;
    return data.devices.filter(d => [d.deviceName, d.serialNumber, d.userDisplayName, d.userUpn, d.manufacturer, d.model, d.osVersion].some(v => v?.toLowerCase().includes(q)));
  }, [data, query]);

  return <main>
    <header><div><span className="eyebrow">LOCAL ANALYSIS</span><h1>Intune Device Inventory Analyzer</h1><p>Turn a native Intune device inventory export into useful, explorable information.</p></div><div className="privacy">● Your inventory stays in this browser</div></header>

    {!data && <section className="drop" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); open(e.dataTransfer.files[0]); }}>
      <div className="fileIcon">ZIP</div><h2>Open an Intune inventory export</h2><p>Select the ZIP downloaded directly from Intune. CSV files are supported too.</p>
      <button onClick={() => input.current?.click()} disabled={busy}>{busy ? 'Reading export…' : 'Select export'}</button>
      <input ref={input} hidden type="file" accept=".zip,.csv" onChange={e => open(e.target.files?.[0])}/>
      <small>No device or user information is uploaded to a server.</small>
      {error && <div className="error">{error}</div>}
    </section>}

    {data && <>
      <section className="source"><div><strong>{data.sourceFileName}</strong><span>{data.devices.length.toLocaleString()} devices · {data.columns.length} source columns</span></div><button className="secondary" onClick={() => { setData(null); setQuery(''); }}>Open another export</button></section>
      <section className="cards"><article><span>Total devices</span><strong>{data.devices.length.toLocaleString()}</strong></article>{Object.entries(platformCounts).sort((a,b)=>b[1]-a[1]).map(([p,n]) => <article key={p}><span>{platformLabel[p]}</span><strong>{n.toLocaleString()}</strong><small>{((n/data.devices.length)*100).toFixed(1)}%</small></article>)}</section>
      <section className="explorer"><div className="explorerHead"><div><h2>Device explorer</h2><p>First normalized view of the imported inventory.</p></div><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search device, user, serial, model…" /></div>
        <div className="tableWrap"><table><thead><tr><th>Device</th><th>Platform</th><th>OS version</th><th>Manufacturer / model</th><th>Primary user</th><th>Compliance</th><th>Last check-in</th></tr></thead><tbody>{filtered.slice(0,250).map(d => <tr key={d.id}><td><strong>{d.deviceName ?? '—'}</strong><small>{d.serialNumber ?? ''}</small></td><td><span className="pill">{platformLabel[d.platform]}</span></td><td>{d.osVersion ?? '—'}</td><td>{[d.manufacturer,d.model].filter(Boolean).join(' · ') || '—'}</td><td>{d.userDisplayName ?? d.userUpn ?? '—'}</td><td>{d.compliance ?? '—'}</td><td>{d.lastCheckIn ?? '—'}</td></tr>)}</tbody></table></div>
        <div className="tableFoot">Showing {Math.min(filtered.length,250).toLocaleString()} of {filtered.length.toLocaleString()} matching devices{filtered.length > 250 ? ' · table limit 250 for this first build' : ''}</div>
      </section>
    </>}
    <footer>Intune Device Inventory Analyzer · Inventory processing is performed locally in your browser.</footer>
  </main>;
}