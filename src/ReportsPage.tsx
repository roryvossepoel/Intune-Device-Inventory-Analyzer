import { encryptionState } from './SecurityInsights';
import { getWindowsIntelligence } from './deviceIntelligence';
import { lifecycleRiskSummary } from './lifecycleRisk';
import type { Device } from './types';

type Props={devices:Device[];demoMode:boolean};
type Row=[string,number];

const fmt=(value:number)=>value.toLocaleString();
const pct=(value:number,total:number)=>total?value/total*100:0;
const pctLabel=(value:number,total:number)=>{const p=pct(value,total);const rounded=Math.round(p*10)/10;return `${Number.isInteger(rounded)?rounded.toFixed(0):rounded.toFixed(1)}%`};
const platformKey=(value:string)=>value==='ios'||value==='ipados'?'applemobile':value;
const platformLabel:Record<string,string>={windows:'Windows',android:'Android',applemobile:'iOS/iPadOS',macos:'macOS',linux:'Linux',unknown:'Unknown'};
function count(values:string[]){return Object.entries(values.reduce<Record<string,number>>((acc,value)=>{acc[value]=(acc[value]||0)+1;return acc},{})).sort((a,b)=>b[1]-a[1]) as Row[]}
function raw(device:Device,pattern:RegExp){return Object.entries(device.raw).find(([name])=>pattern.test(name))?.[1]?.trim()||''}
function daysOld(value:string){const time=Date.parse(value);return Number.isFinite(time)?(Date.now()-time)/86400000:null}

export default function ReportsPage({devices,demoMode}:Props){
  const total=devices.length;
  const compliant=devices.filter(device=>device.compliance?.toLowerCase()==='compliant').length;
  const noncompliant=devices.filter(device=>device.compliance?.toLowerCase()==='noncompliant').length;
  const stale30=devices.filter(device=>{const value=device.lastCheckIn?Date.parse(device.lastCheckIn):Number.NaN;return Number.isFinite(value)&&(Date.now()-value)/86400000>30}).length;
  let encrypted=0,notEncrypted=0,unknownEncryption=0;
  for(const device of devices){const state=encryptionState(device);if(state===true)encrypted++;else if(state===false)notEncrypted++;else unknownEncryption++}
  const platforms=count(devices.map(device=>platformKey(device.platform)));
  const manufacturers=count(devices.map(device=>device.manufacturer?.trim()||'Unknown').filter(value=>value!=='Unknown'));
  const models=new Set(devices.map(device=>device.model?.trim()).filter(Boolean)).size;
  const osVersions=new Set(devices.map(device=>`${platformKey(device.platform)}|${device.osVersion?.trim()||'Unknown'}`)).size;
  const users=new Set(devices.map(device=>device.userUpn||device.userDisplayName).filter(Boolean)).size;
  const lifecycle=lifecycleRiskSummary(devices);
  const windows=devices.filter(device=>platformKey(device.platform)==='windows');
  const android=devices.filter(device=>platformKey(device.platform)==='android');
  const windowsBehind=windows.filter(device=>getWindowsIntelligence(device.osVersion)?.updateHealth==='behind').length;
  const androidOldPatch=android.filter(device=>{const age=daysOld(raw(device,/^Security patch level$/i));return age!==null&&age>90}).length;
  const topPlatform=platforms[0];
  const topManufacturer=manufacturers[0];
  const securityScore=Math.round((pct(compliant,total)+pct(encrypted,total))/2);

  return <section className="reportStudio">
    <header className="reportStudioHero">
      <div><span className="reportEyebrow">REPORT STUDIO</span><h2>Turn inventory findings into stories people can use.</h2><p>Reports will combine plain-language interpretation with the exact charts and diagrams behind the finding, so each story can be copied directly into a management update, presentation or technical review.</p></div>
      <div className="reportPlanCard"><span>{demoMode?'Demo inventory':'Current inventory'}</span><strong>{fmt(total)} devices</strong><small>{fmt(users)} identified users · {platforms.length} platform{platforms.length===1?'':'s'}</small><div><b>PDF</b><b>PowerPoint</b><b>Copy story</b></div></div>
    </header>

    <div className="reportStoryIntro"><span>FIRST REPORT FORMAT</span><h3>Three reusable inventory stories</h3><p>Each story is generated from the active inventory and keeps the narrative next to the visual evidence.</p></div>

    <div className="reportStories">
      <Story number="01" title="Security posture" kicker="COMPLIANCE & PROTECTION" text={securityText(total,compliant,noncompliant,encrypted,notEncrypted,stale30)}>
        <div className="reportMetricRow"><ReportMetric label="Compliance" value={pctLabel(compliant,total)} detail={`${fmt(compliant)} compliant`}/><ReportMetric label="Encryption" value={pctLabel(encrypted,total)} detail={`${fmt(notEncrypted)} not encrypted`}/><ReportMetric label="No check-in >30d" value={fmt(stale30)} detail={`${pctLabel(stale30,total)} of inventory`}/></div>
        <div className="reportVisualPair"><Ring value={securityScore} label="combined signal"/><BarList rows={[["Compliant",compliant],["Noncompliant",noncompliant],["Not encrypted",notEncrypted],["Encryption unknown",unknownEncryption]]} total={total}/></div>
      </Story>

      <Story number="02" title="Estate composition" kicker="PLATFORMS & STANDARDIZATION" text={estateText(total,topPlatform,topManufacturer,models,osVersions)}>
        <div className="reportMetricRow"><ReportMetric label="Platforms" value={fmt(platforms.length)} detail={`${fmt(total)} total devices`}/><ReportMetric label="Models" value={fmt(models)} detail="reported model families"/><ReportMetric label="OS versions" value={fmt(osVersions)} detail="platform/version combinations"/></div>
        <div className="reportVisualPair reportCompositionVisual"><BarList rows={platforms.map(([label,value])=>[platformLabel[label]||label,value])} total={total}/><BarList rows={manufacturers.slice(0,5)} total={total}/></div>
      </Story>

      <Story number="03" title="Lifecycle & update position" kicker="SERVICING RISK" text={lifecycleText(lifecycle.risk,lifecycle.assessed,windowsBehind,androidOldPatch)}>
        <div className="reportMetricRow"><ReportMetric label="Lifecycle risk" value={fmt(lifecycle.risk)} detail={`${fmt(lifecycle.assessed)} devices assessed`}/><ReportMetric label="Windows behind" value={fmt(windowsBehind)} detail={`${fmt(windows.length)} Windows devices`}/><ReportMetric label="Android patch >90d" value={fmt(androidOldPatch)} detail={`${fmt(android.length)} Android devices`}/></div>
        <div className="reportLifecycleDiagram"><div><span>Inventory</span><strong>{fmt(total)}</strong></div><i>→</i><div><span>Assessed</span><strong>{fmt(lifecycle.assessed)}</strong></div><i>→</i><div className={lifecycle.risk?'attention':'good'}><span>Needs attention</span><strong>{fmt(lifecycle.risk)}</strong></div></div>
      </Story>
    </div>

    <section className="reportRoadmap">
      <div><span>WHAT COMES NEXT</span><h3>From preview to exportable report pack</h3><p>The next step is turning these generated stories into reusable output rather than another dashboard to read.</p></div>
      <div className="reportRoadmapItems"><Roadmap n="1" title="Generate" text="Create the three stories from the current inventory and selected scope."/><Roadmap n="2" title="Refine" text="Keep the narrative and its chart together while choosing what belongs in the final pack."/><Roadmap n="3" title="Export" text="Produce management-ready PDF and PowerPoint output without sending inventory to a backend."/></div>
    </section>
  </section>;
}

function securityText(total:number,compliant:number,noncompliant:number,encrypted:number,notEncrypted:number,stale:number){
  if(!total)return 'No devices are available in the current inventory.';
  const parts=[`${pctLabel(compliant,total)} of devices are compliant`];
  if(noncompliant)parts.push(`${fmt(noncompliant)} devices are noncompliant`);
  parts.push(`${pctLabel(encrypted,total)} report an encrypted state`);
  if(notEncrypted)parts.push(`${fmt(notEncrypted)} devices report that they are not encrypted`);
  if(stale)parts.push(`${fmt(stale)} devices have not checked in for more than 30 days`);
  return `${parts.join('. ')}. This story combines the current compliance, encryption and activity signals so the reader can immediately see both coverage and exceptions.`;
}
function estateText(total:number,topPlatform:Row|undefined,topManufacturer:Row|undefined,models:number,versions:number){
  const lead=topPlatform?`${platformLabel[topPlatform[0]]||topPlatform[0]} is the largest platform with ${fmt(topPlatform[1])} devices (${pctLabel(topPlatform[1],total)})`:'No dominant platform is available';
  const vendor=topManufacturer?`${topManufacturer[0]} is the largest reported manufacturer with ${fmt(topManufacturer[1])} devices`:'manufacturer data is limited';
  return `${lead}. ${vendor}. The current estate contains ${fmt(models)} reported models and ${fmt(versions)} platform/version combinations, giving a direct view of standardization and version diversity.`;
}
function lifecycleText(risk:number,assessed:number,windowsBehind:number,androidOldPatch:number){
  const first=assessed?`${fmt(risk)} of ${fmt(assessed)} assessed devices currently carry a lifecycle or patch-age risk`:'Lifecycle could not be assessed from the current inventory';
  const details:string[]=[];if(windowsBehind)details.push(`${fmt(windowsBehind)} Windows devices are behind the current known build`);if(androidOldPatch)details.push(`${fmt(androidOldPatch)} Android devices report a security patch older than 90 days`);
  return `${first}.${details.length?` ${details.join('. ')}.`:''} The report keeps lifecycle and update position together so remediation can be prioritized by platform.`;
}
function Story({number,kicker,title,text,children}:{number:string;kicker:string;title:string;text:string;children:React.ReactNode}){return <article className="reportStory"><header><span>{number}</span><div><small>{kicker}</small><h3>{title}</h3></div></header><p className="reportNarrative">{text}</p>{children}</article>}
function ReportMetric({label,value,detail}:{label:string;value:string;detail:string}){return <div className="reportMetric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>}
function Ring({value,label}:{value:number;label:string}){const safe=Math.max(0,Math.min(100,value));return <div className="reportRing" style={{background:`conic-gradient(#2563eb 0 ${safe}%,#e8eef6 ${safe}% 100%)`}}><div><strong>{safe}%</strong><span>{label}</span></div></div>}
function BarList({rows,total}:{rows:Row[];total:number}){return <div className="reportBars">{rows.filter(([,value])=>value>0).slice(0,5).map(([label,value])=><div key={label}><div><span>{label}</span><strong>{fmt(value)}</strong><small>{pctLabel(value,total)}</small></div><i><b style={{width:pctLabel(value,total)}}/></i></div>)}</div>}
function Roadmap({n,title,text}:{n:string;title:string;text:string}){return <article><span>{n}</span><div><strong>{title}</strong><p>{text}</p></div></article>}
