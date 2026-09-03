import type { Device } from './types';
import { describeOsVersion, getWindowsIntelligence } from './deviceIntelligence';
import { encryptionState } from './SecurityInsights';

const platformKey=(platform:string)=>platform==='ios'||platform==='ipados'?'applemobile':platform;
const platformLabel:Record<string,string>={windows:'Windows',android:'Android',applemobile:'Apple Mobile',macos:'macOS',linux:'Linux',unknown:'Unknown'};
const osFamilyLabel:Record<string,string>={windows:'Windows',android:'Android',applemobile:'iOS/iPadOS',macos:'macOS',linux:'Linux',unknown:'Unknown'};

function rawValue(device:Device,patterns:RegExp[]){for(const [name,value] of Object.entries(device.raw)){if(patterns.some(pattern=>pattern.test(name))&&value?.trim())return value.trim()}return ''}
function formatDate(value:string|null){if(!value)return '—';const date=new Date(value);return Number.isFinite(date.getTime())?date.toLocaleString():value}
function boolLabel(value:string){if(/^true$/i.test(value))return 'Yes';if(/^false$/i.test(value))return 'No';return value||'—'}
function encryptionLabel(device:Device){const state=encryptionState(device);return state===true?'Encrypted':state===false?'Not encrypted':'Unknown'}
function tone(value:string){const v=value.toLowerCase().replace(/[\s_-]/g,'');if(v==='compliant'||v==='encrypted'||v==='yes'||v==='current'||v==='supervised')return 'good';if(v==='noncompliant'||v==='notencrypted'||v==='no'||v==='behind'||v==='expired')return 'bad';if(v.includes('grace')||v.includes('review')||v.includes('unknown'))return 'warn';return 'neutral'}

export default function DeviceDetail({device,onClose}:{device:Device;onClose:()=>void}){
  const p=platformKey(device.platform);
  const groups=groupRaw(device.raw);
  const osDisplay=describeOsVersion(p as 'windows'|'android'|'applemobile'|'macos'|'linux'|'unknown',device.osVersion)||device.osVersion||'—';
  const encryption=encryptionLabel(device);
  const windows=p==='windows'?getWindowsIntelligence(device.osVersion):null;
  const securityPatch=rawValue(device,[/^Security patch level$/i]);
  const supervised=rawValue(device,[/^Supervised$/i]);
  const sku=rawValue(device,[/^SkuFamily$/i,/^OS SKU$/i,/^SKU$/i]);
  const architecture=rawValue(device,[/^ProcessorArchitecture$/i,/^Architecture$/i]);
  const joinType=rawValue(device,[/^JoinType$/i,/^Join type$/i]);
  const certExpiry=rawValue(device,[/^Management certificate expiration date$/i]);

  return <div className="drawerShade" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
    <aside className="drawer deviceDetailV2">
      <div className="drawerTop"><button onClick={onClose}>← Back</button><span className="tag">{platformLabel[p]||p}</span></div>
      <section className="deviceDetailHero">
        <div><span className="eyebrow">DEVICE DETAIL</span><h2>{device.deviceName||'Unnamed device'}</h2><p>{device.serialNumber||'No serial number reported'}</p></div>
        <div className="deviceDetailHeroBadges"><StatusBadge label={device.compliance||'Unknown compliance'}/><StatusBadge label={encryption}/></div>
      </section>

      <section className="deviceSummaryGrid">
        <SummaryItem label="Operating system" value={osDisplay}/>
        <SummaryItem label="Manufacturer" value={device.manufacturer||'—'}/>
        <SummaryItem label="Model" value={device.model||'—'}/>
        <SummaryItem label="Primary user" value={device.userDisplayName||device.userUpn||'—'}/>
        <SummaryItem label="Ownership" value={device.ownership||'—'}/>
        <SummaryItem label="Managed by" value={device.managedBy||'—'}/>
        <SummaryItem label="Last check-in" value={formatDate(device.lastCheckIn)}/>
        <SummaryItem label="Join type" value={joinType||'—'}/>
      </section>

      {(windows||securityPatch||supervised||sku||architecture||certExpiry)&&<section className="deviceIntelligenceSummary">
        <div className="deviceSectionHeading"><div><span className="eyebrow">DEVICE INTELLIGENCE</span><h3>Platform context</h3></div><small>Interpreted from normalized and original Intune fields</small></div>
        <div className="deviceIntelligenceTiles">
          {windows?.release&&<IntelligenceItem label="Windows release" value={windows.release.displayName} note={windows.latestBuild?`Latest ${windows.latestBuild}`:undefined}/>} 
          {windows&&<IntelligenceItem label="Update position" value={windows.updateHealth==='current'?'Current':windows.updateHealth==='behind'?'Behind current build':windows.updateHealth==='edition-review'?'Edition review needed':'Unknown'} toneName={windows.updateHealth==='current'?'good':windows.updateHealth==='behind'?'bad':windows.updateHealth==='edition-review'?'warn':'neutral'}/>} 
          {sku&&<IntelligenceItem label="SKU / edition" value={sku}/>} 
          {securityPatch&&<IntelligenceItem label="Security patch" value={securityPatch}/>} 
          {supervised&&<IntelligenceItem label="Supervised" value={boolLabel(supervised)} toneName={/^true$/i.test(supervised)?'good':/^false$/i.test(supervised)?'warn':'neutral'}/>} 
          {architecture&&<IntelligenceItem label="Architecture" value={architecture}/>} 
          {certExpiry&&<IntelligenceItem label="Management certificate" value={certExpiry}/>} 
        </div>
      </section>}

      <section className="detailCards deviceDetailCards">
        <DetailCard title="Identity" rows={[['Device ID',device.id],['Serial number',device.serialNumber],['Primary user',device.userDisplayName],['User UPN',device.userUpn]]}/>
        <DetailCard title="Operating system" rows={[['Platform',platformLabel[p]||p],['OS family',osFamilyLabel[p]||p],['Source OS',device.sourceOS],['Reported version',device.osVersion]]}/>
        <DetailCard title="Management" rows={[['Managed by',device.managedBy],['Ownership',device.ownership],['Compliance',device.compliance],['Last check-in',device.lastCheckIn]]}/>
        <DetailCard title="Hardware" rows={[['Manufacturer',device.manufacturer],['Model',device.model],['Architecture',architecture||null],['SKU / edition',sku||null]]}/>
      </section>

      <div className="rawTitle"><div><h3>Original Intune data</h3><p>Unchanged source values from the imported export.</p></div><span>{Object.keys(device.raw).length} fields</span></div>
      {Object.entries(groups).map(([name,entries])=><details className="raw" key={name} open={name==='Device & management'}><summary>{name} · {entries.length}</summary><div className="rawGrid">{entries.map(([k,v])=><div key={k}><span>{k}</span><strong>{v||'—'}</strong></div>)}</div></details>)}
    </aside>
  </div>;
}

function StatusBadge({label}:{label:string}){return <span className={`deviceStatusBadge ${tone(label)}`}>{label}</span>}
function SummaryItem({label,value}:{label:string;value:string}){return <article><span>{label}</span><strong title={value}>{value}</strong></article>}
function IntelligenceItem({label,value,note,toneName='neutral'}:{label:string;value:string;note?:string;toneName?:string}){return <article className={`deviceIntelligenceTile ${toneName}`}><span>{label}</span><strong>{value}</strong>{note&&<small>{note}</small>}</article>}
function DetailCard({title,rows}:{title:string;rows:[string,string|null][]}){return <article><h3>{title}</h3>{rows.map(([label,value])=><div key={label}><span>{label}</span><strong>{value||'—'}</strong></div>)}</article>}
function groupRaw(raw:Record<string,string>){const result:Record<string,[string,string][]>= {'Device & management':[],'User':[],'Hardware':[],'Operating system':[],'Security':[],'Storage & network':[],'Other':[]};for(const entry of Object.entries(raw)){const name=entry[0].toLowerCase();let group='Other';if(/user|email|upn/.test(name))group='User';else if(/manufacturer|model|serial|processor|tpm|bios|architecture|physical|memory/.test(name))group='Hardware';else if(/os|operating|version|build|edition|sku/.test(name))group='Operating system';else if(/compliance|encrypt|secure|defender|firewall|password|threat/.test(name))group='Security';else if(/storage|disk|wifi|wi-fi|ethernet|ip address|mac address|imei|meid|phone|network|subscriber/.test(name))group='Storage & network';else if(/device|managed|management|enroll|ownership|join|check-in|last sync|intune|azure|entra/.test(name))group='Device & management';result[group].push(entry)}return Object.fromEntries(Object.entries(result).filter(([,entries])=>entries.length))}
