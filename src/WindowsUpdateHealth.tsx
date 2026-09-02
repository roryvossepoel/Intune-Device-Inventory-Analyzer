import SmartTable from './SmartTable';
import type { SmartColumn } from './SmartTable';
import type { Device } from './types';
import { getWindowsIntelligence } from './deviceIntelligence';

type HealthRow={release:string;build:string;health:string;servicing:string;latest:string;devices:number;share:number};

const rawVersion=(d:Device)=>{
  const entry=Object.entries(d.raw).find(([k])=>k.trim().toLowerCase()==='os version');
  return entry?.[1]?.trim() || d.osVersion || '';
};
const label=(value:string)=>value==='current'?'Current':value==='behind'?'Behind latest':value==='edition-review'?'Review edition':'Unknown';

export default function WindowsUpdateHealth({devices}:{devices:Device[]}){
  const windows=devices.filter(d=>d.platform==='windows');
  if(!windows.length)return null;
  const counts={current:0,behind:0,review:0,unknown:0};
  const map=new Map<string,HealthRow>();
  for(const d of windows){
    const raw=rawVersion(d); const info=getWindowsIntelligence(raw); const health=info?.updateHealth??'unknown';
    if(health==='current')counts.current++; else if(health==='behind')counts.behind++; else if(health==='edition-review')counts.review++; else counts.unknown++;
    const release=info?.releaseName||'Unknown Windows release';
    const latest=info?.latestBuild||'—';
    const key=`${release}|${raw}|${health}`;
    const row=map.get(key)??{release,build:raw||'Unknown',health:label(health),servicing:info?.servicing==='supported'?'Supported':info?.servicing==='edition-dependent'?'Edition dependent':'Unknown',latest,devices:0,share:0};
    row.devices++; map.set(key,row);
  }
  const rows=[...map.values()].map(r=>({...r,share:r.devices/windows.length*100})).sort((a,b)=>b.devices-a.devices);
  const columns:SmartColumn<HealthRow>[]=[
    {key:'release',label:'Windows release',value:r=>r.release,render:r=><strong>{r.release}</strong>},
    {key:'build',label:'Reported build',value:r=>r.build},
    {key:'health',label:'Update status',value:r=>r.health,render:r=><span className={`updateHealthTag ${r.health.toLowerCase().replaceAll(' ','-')}`}>{r.health}</span>},
    {key:'servicing',label:'Servicing',value:r=>r.servicing},
    {key:'latest',label:'Latest known build',value:r=>r.latest},
    {key:'devices',label:'Devices',value:r=>r.devices,numeric:true},
    {key:'share',label:'Share',value:r=>r.share,numeric:true,render:r=>`${r.share.toFixed(1)}%`}
  ];
  return <section className="windowsHealthSection">
    <div className="windowsHealthIntro"><div><span className="eyebrow">DEVICE INTELLIGENCE</span><h2>Windows update health</h2><p>Reported Windows builds translated to releases and compared with the latest known servicing build.</p></div><span className="intelligenceStamp">{windows.length.toLocaleString()} Windows devices</span></div>
    <div className="updateHealthKpis">
      <HealthStat label="Current" value={counts.current} total={windows.length} tone="good"/>
      <HealthStat label="Behind latest" value={counts.behind} total={windows.length} tone="warn"/>
      <HealthStat label="Review edition" value={counts.review} total={windows.length} tone="review"/>
      <HealthStat label="Unknown" value={counts.unknown} total={windows.length} tone="neutral"/>
    </div>
    <div className="dataCard updateHealthTable"><div className="dataHead"><div><h2>Windows builds</h2><p>{rows.length.toLocaleString()} distinct build states detected</p></div></div><SmartTable rows={rows} columns={columns} rowKey={r=>`${r.release}|${r.build}|${r.health}`} exportName="windows-update-health"/></div>
    <p className="healthMethodNote">“Current” includes the latest regular build and a separately documented current hotpatch build when present. “Behind latest” means the device reports an older revision in a known supported build family. Edition-dependent releases are flagged for review rather than marked unsupported.</p>
  </section>;
}

function HealthStat({label,value,total,tone}:{label:string;value:number;total:number;tone:string}){return <article className={`updateHealthStat ${tone}`}><span>{label}</span><strong>{value.toLocaleString()}</strong><small>{total?(value/total*100).toFixed(1):'0.0'}%</small></article>}
