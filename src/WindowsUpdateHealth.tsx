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
    {key:'release',label:'Windows release',value:r=>r.release,render:r=><span className="releaseCell"><WindowsLogo/><strong>{r.release}</strong></span>},
    {key:'build',label:'Reported build',value:r=>r.build},
    {key:'health',label:'Update status',value:r=>r.health,render:r=><HealthPill health={r.health}/>},
    {key:'servicing',label:'Servicing',value:r=>r.servicing,render:r=><span className={`servicingPill ${r.servicing==='Supported'?'supported':r.servicing==='Edition dependent'?'review':'unknown'}`}>{r.servicing}</span>},
    {key:'latest',label:'Latest known build',value:r=>r.latest},
    {key:'devices',label:'Devices',value:r=>r.devices,numeric:true},
    {key:'share',label:'Share',value:r=>r.share,numeric:true,render:r=><span className="shareCell"><strong>{r.share.toFixed(1)}%</strong><i><b style={{width:`${Math.min(100,r.share)}%`}}/></i></span>}
  ];
  return <section className="windowsHealthSection">
    <div className="windowsHealthIntro"><div className="intelligenceHeading"><span className="windowsHeroIcon"><WindowsLogo/></span><div><span className="eyebrow">DEVICE INTELLIGENCE</span><h2>Windows update health</h2><p>Reported Windows builds translated to releases and compared with the latest known servicing build.</p></div></div><span className="intelligenceStamp"><WindowsLogo/>{windows.length.toLocaleString()} Windows devices</span></div>
    <div className="updateHealthKpis">
      <HealthStat icon="check" label="Current" value={counts.current} total={windows.length} tone="good"/>
      <HealthStat icon="clock" label="Behind latest" value={counts.behind} total={windows.length} tone="warn"/>
      <HealthStat icon="review" label="Review edition" value={counts.review} total={windows.length} tone="review"/>
      <HealthStat icon="unknown" label="Unknown" value={counts.unknown} total={windows.length} tone="neutral"/>
    </div>
    <div className="dataCard updateHealthTable"><div className="dataHead"><div><h2>Windows builds</h2><p>{rows.length.toLocaleString()} distinct build states detected</p></div></div><SmartTable rows={rows} columns={columns} rowKey={r=>`${r.release}|${r.build}|${r.health}`} exportName="windows-update-health"/></div>
    <p className="healthMethodNote">“Current” includes the latest regular build and a separately documented current hotpatch build when present. “Behind latest” means the device reports an older revision in a known supported build family. Edition-dependent releases are flagged for review rather than marked unsupported.</p>
  </section>;
}

function HealthStat({icon,label,value,total,tone}:{icon:'check'|'clock'|'review'|'unknown';label:string;value:number;total:number;tone:string}){return <article className={`updateHealthStat ${tone}`}><span className="healthStatIcon"><StatusIcon type={icon}/></span><div><span>{label}</span><strong>{value.toLocaleString()}</strong><small>{total?(value/total*100).toFixed(1):'0.0'}%</small></div></article>}
function HealthPill({health}:{health:string}){const cls=health.toLowerCase().replaceAll(' ','-');const icon=health==='Current'?'check':health==='Behind latest'?'clock':health==='Review edition'?'review':'unknown';return <span className={`updateHealthTag ${cls}`}><StatusIcon type={icon}/>{health}</span>}
function WindowsLogo(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5.2 10.7 4v7.2H3V5.2Zm8.7-1.35L21 2.5v8.7h-9.3V3.85ZM3 12.2h7.7V20L3 18.8v-6.6Zm8.7 0H21v9.3l-9.3-1.35V12.2Z" fill="currentColor"/></svg>}
function StatusIcon({type}:{type:'check'|'clock'|'review'|'unknown'}){if(type==='check')return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6.5 12.4 3.2 3.2 7.8-8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>;if(type==='clock')return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M12 7.5V12l3.2 1.9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;if(type==='review')return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2"/><path d="m15 15 4 4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/></svg>;return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.7 9a2.5 2.5 0 1 1 4.4 1.7c-1.1 1-2.1 1.5-2.1 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="17.5" r="1.1" fill="currentColor"/></svg>}
