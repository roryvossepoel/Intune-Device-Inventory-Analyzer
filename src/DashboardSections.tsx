import DashboardSection from './DashboardSection';
import WindowsLifecycle from './WindowsLifecycle';
import EncryptionCard, { securityAttention } from './SecurityInsights';
import { getWindowsIntelligence } from './deviceIntelligence';
import type { Device } from './types';

type DrillField='compliance'|'osVersion'|'manufacturer'|'model'|'user'|'encryption';
type Drill=(field:DrillField,label:string,value:string)=>void;
type Row=[string,number];
type SecurityTone='good'|'warn'|'bad';

const platformLabel:Record<string,string>={windows:'Windows',android:'Android',applemobile:'iOS/iPadOS',macos:'macOS',linux:'Linux',unknown:'Unknown'};
const fmt=(n:number)=>n.toLocaleString();
const pct=(n:number,total:number)=>total?`${(n/total*100).toFixed(1)}%`:'0.0%';
const clean=(v:string|null|undefined)=>v?.trim()||'Unknown';
const platformKey=(value:string)=>value==='ios'||value==='ipados'?'applemobile':value;

function rawValue(device:Device,patterns:RegExp[]){for(const [name,value] of Object.entries(device.raw)){if(patterns.some(p=>p.test(name))&&value?.trim())return value.trim()}return ''}
function countValues(values:string[]){return Object.entries(values.reduce<Record<string,number>>((a,v)=>{a[v]=(a[v]??0)+1;return a},{})).sort((a,b)=>b[1]-a[1]) as Row[]}
function daysSince(value:string|null){if(!value)return null;const time=Date.parse(value);return Number.isFinite(time)?(Date.now()-time)/86400000:null}
function daysOld(value:string){const time=Date.parse(value);return Number.isFinite(time)?(Date.now()-time)/86400000:null}
function daysUntil(value:string){const time=Date.parse(value);return Number.isFinite(time)?(time-Date.now())/86400000:null}
function architecture(device:Device){return rawValue(device,[/^ProcessorArchitecture$/i,/^Architecture$/i])||'Unknown'}
function joinType(device:Device){return rawValue(device,[/^JoinType$/i,/^Join type$/i])||'Unknown'}
function sku(device:Device){return rawValue(device,[/^SkuFamily$/i,/^OS SKU$/i,/^SKU$/i])||'Unknown'}
function certExpiry(device:Device){return rawValue(device,[/^Management certificate expiration date$/i])}
function patchLevel(device:Device){return rawValue(device,[/^Security patch level$/i])}
function managedBy(device:Device){return clean(device.managedBy)}
function enrollmentDate(device:Device){return rawValue(device,[/^Enrollment date$/i,/^EnrollmentDateTime$/i,/^Enrolled date$/i])}

function hardwareType(device:Device){
  const explicit=rawValue(device,[/chassis/i,/form.?factor/i,/device.?type/i,/hardware.?type/i,/device.?category/i]).toLowerCase();
  const model=(device.model||'').toLowerCase();
  const manufacturer=(device.manufacturer||'').toLowerCase();
  const signal=`${explicit} ${model} ${manufacturer}`;
  if(platformKey(device.platform)==='applemobile'){if(/ipad/.test(signal))return 'Tablet';return 'Smartphone'}
  if(/virtual|vmware|hyper-v|parallels|virtualbox|kvm|virtual machine|virtual desktop|horizon|avd/.test(signal))return 'Virtual';
  if(/server/.test(signal))return 'Server';
  if(device.platform==='android'){if(/tablet|slate|galaxy tab|tab active|pixel tablet|sm-[xtp]/.test(signal))return 'Tablet';return 'Smartphone'}
  if(device.platform==='macos'){if(/macbook/.test(signal))return 'Laptop';if(/imac|mac mini|mac studio|mac pro/.test(signal))return 'Desktop'}
  if(/tablet|slate|ipad|galaxy tab|surface pro|surface go/.test(signal))return 'Tablet';
  if(/smartphone|phone|handheld/.test(explicit))return 'Smartphone';
  if(/laptop|notebook|portable|mobile workstation|macbook|latitude|thinkpad|thinkbook|ideapad|elitebook|probook|zbook|surface laptop|galaxy book|travelmate|lifebook|dynabook/.test(signal))return 'Laptop';
  if(/desktop|tower|mini pc|micro pc|small form factor|sff|optiplex|thinkcentre|prodesk|elitedesk|imac|mac mini|mac studio|mac pro|surface studio|workstation/.test(signal))return 'Desktop';
  return 'Unknown';
}

function androidMode(device:Device){
  const source=clean(device.sourceOS);
  const raw=rawValue(device,[/^ManagementMode$/i,/^Management mode$/i,/^EnrollmentType$/i,/^Enrollment type$/i]);
  const value=raw||source;
  const match=value.match(/\((.+)\)/);
  if(match)return match[1];
  if(/corporate.*work profile|cope/i.test(value))return 'Corporate-owned work profile (COPE)';
  if(/fully managed|cobo/i.test(value))return 'Fully managed (COBO)';
  if(/dedicated|cosu/i.test(value))return 'Dedicated (COSU)';
  if(/personally.*work profile|byod/i.test(value))return 'Personally owned work profile (BYOD)';
  if(/^aosp/i.test(value))return value.replace(/^AOSP\s*/i,'AOSP ');
  return value==='Android'?'Android / Unknown':value;
}
function appleDeviceFamily(device:Device){const value=`${device.sourceOS||''} ${device.model||''}`.toLowerCase();if(value.includes('ipad'))return 'iPad';if(value.includes('iphone'))return 'iPhone';return 'Unknown'}
function supervision(device:Device){const value=rawValue(device,[/^Supervised$/i]);if(/^true$/i.test(value))return 'Supervised';if(/^false$/i.test(value))return 'Not supervised';return 'Unknown'}

function platformDevices(allDevices:Device[],selectedPlatform:string|null,target:string,currentScope:Device[]){
  if(selectedPlatform)return selectedPlatform===target?currentScope:[];
  return allDevices.filter(d=>platformKey(d.platform)===target);
}

export default function DashboardSections({devices,allDevices,total,compliance,compliant,noncompliant,grace,stale,platform,drill}:{devices:Device[];allDevices:Device[];total:number;compliance:Row[];compliant:number;noncompliant:number;grace:number;stale:number;platform:string|null;drill:Drill}){
  const security=securityAttention(devices);
  const compliancePct=total?compliant/total*100:0;
  const complianceTone:SecurityTone=compliancePct>=90?'good':compliancePct>=75?'warn':'bad';
  const securityTone:SecurityTone=security.rooted>0?'bad':security.notEncrypted>0||security.unknownEncryption>0?'warn':'good';
  const windows=platformDevices(allDevices,platform,'windows',devices);
  const android=platformDevices(allDevices,platform,'android',devices);
  const apple=platformDevices(allDevices,platform,'applemobile',devices);
  const macos=platformDevices(allDevices,platform,'macos',devices);
  const linux=platformDevices(allDevices,platform,'linux',devices);

  const staleBuckets:Row[]=[
    ['0–7 days',devices.filter(d=>{const age=daysSince(d.lastCheckIn);return age!==null&&age<=7}).length],
    ['8–30 days',devices.filter(d=>{const age=daysSince(d.lastCheckIn);return age!==null&&age>7&&age<=30}).length],
    ['31–90 days',devices.filter(d=>{const age=daysSince(d.lastCheckIn);return age!==null&&age>30&&age<=90}).length],
    ['> 90 days',devices.filter(d=>{const age=daysSince(d.lastCheckIn);return age!==null&&age>90}).length],
    ['Unknown',devices.filter(d=>daysSince(d.lastCheckIn)===null).length]
  ];
  const enrollmentBuckets:Row[]=[
    ['0–30 days',devices.filter(d=>{const age=daysOld(enrollmentDate(d));return age!==null&&age<=30}).length],
    ['31–90 days',devices.filter(d=>{const age=daysOld(enrollmentDate(d));return age!==null&&age>30&&age<=90}).length],
    ['91–365 days',devices.filter(d=>{const age=daysOld(enrollmentDate(d));return age!==null&&age>90&&age<=365}).length],
    ['> 1 year',devices.filter(d=>{const age=daysOld(enrollmentDate(d));return age!==null&&age>365}).length],
    ['Unknown',devices.filter(d=>daysOld(enrollmentDate(d))===null).length]
  ];
  const serials=devices.map(d=>d.serialNumber?.trim()).filter((v):v is string=>!!v);
  const names=devices.map(d=>d.deviceName?.trim()).filter((v):v is string=>!!v);
  const duplicateSerials=countValues(serials).filter(([,n])=>n>1).reduce((sum,[,n])=>sum+n,0);
  const duplicateNames=countValues(names).filter(([,n])=>n>1).reduce((sum,[,n])=>sum+n,0);
  const inventoryQuality:Row[]=[
    ['Duplicate serial entries',duplicateSerials],
    ['Duplicate device names',duplicateNames],
    ['Missing serial number',total-serials.length],
    ['Missing manufacturer',devices.filter(d=>!d.manufacturer?.trim()).length],
    ['Missing model',devices.filter(d=>!d.model?.trim()).length],
    ['Unknown platform',devices.filter(d=>d.platform==='unknown').length],
    ['Missing / invalid last check-in',devices.filter(d=>daysSince(d.lastCheckIn)===null).length]
  ];

  const manufacturers=countValues(devices.map(d=>clean(d.manufacturer))).filter(([label])=>label!=='Unknown').slice(0,8);
  const models=countValues(devices.map(d=>clean(d.model))).filter(([label])=>label!=='Unknown').slice(0,8);
  const types=countValues(devices.map(hardwareType));
  const ownership=countValues(devices.map(d=>clean(d.ownership)));
  const userCounts=countValues(devices.map(d=>clean(d.userUpn||d.userDisplayName)).filter(v=>v!=='Unknown'));
  const userDistribution:Row[]=[['1 device',userCounts.filter(([,n])=>n===1).length],['2 devices',userCounts.filter(([,n])=>n===2).length],['3+ devices',userCounts.filter(([,n])=>n>=3).length],['No primary user',devices.filter(d=>!d.userUpn&&!d.userDisplayName).length]];

  const osByPlatform=Object.entries(devices.reduce<Record<string,Device[]>>((acc,d)=>{const key=platformKey(d.platform);(acc[key]??=[]).push(d);return acc},{})).sort((a,b)=>b[1].length-a[1].length);
  const adoption=osByPlatform.map(([p,list])=>{const versions=countValues(list.map(d=>clean(d.osVersion))),top=versions[0];return {platform:p,devices:list.length,versions:versions.length,topVersion:top?.[0]||'Unknown',topCount:top?.[1]||0}});

  const windowsSkus=countValues(windows.map(sku));
  const windowsArch=countValues(windows.map(architecture));
  const bios=windows.filter(d=>!!rawValue(d,[/^SystemManagementBIOSVersion$/i])).length;
  const tpm=windows.filter(d=>!!rawValue(d,[/^TPMManufacturerId$/i,/^TPMManufacturerVersion$/i])).length;
  const windowsBehind=windows.filter(d=>getWindowsIntelligence(d.osVersion)?.updateHealth==='behind').length;
  const windowsEditionReview=windows.filter(d=>getWindowsIntelligence(d.osVersion)?.updateHealth==='edition-review').length;

  const androidPatch=countValues(android.map(d=>patchLevel(d)||'Unknown'));
  const androidOldPatch=android.filter(d=>{const age=daysOld(patchLevel(d));return age!==null&&age>90}).length;
  const androidUnknownPatch=android.filter(d=>!patchLevel(d)).length;
  const androidModes=countValues(android.map(androidMode));

  const appleFamilies=countValues(apple.map(appleDeviceFamily));
  const appleSupervision=countValues(apple.map(supervision));
  const appleCert=certificateBuckets(apple);
  const macArch=countValues(macos.map(architecture));
  const macJoin=countValues(macos.map(joinType));
  const macCert=certificateBuckets(macos);
  const linuxArch=countValues(linux.map(architecture));
  const linuxJoin=countValues(linux.map(joinType));
  const managed=countValues(devices.map(managedBy));

  return <>
    <DashboardSection icon="security" title="Health & Security" subtitle="Compliance, protection and security signals across the managed inventory.">
      <div className="dashboardMainGrid securityMainGrid">
        <Card title="Compliance status" subtitle="Current device compliance state" tone={complianceTone}><Donut total={total} items={compliance} center={`${compliancePct.toFixed(1)}%`} label="compliant"/><Distribution rows={compliance} total={total} onClick={label=>drill('compliance','Compliance',label)}/></Card>
        <EncryptionCard devices={devices} onNotEncrypted={()=>security.notEncrypted&&drill('encryption','Encryption','false')} onUnknown={()=>security.unknownEncryption&&drill('encryption','Encryption','Unknown')}/>
        <Card title="Security attention" subtitle="Explicit security signals requiring review" tone={securityTone}><SignalList rows={[[security.notEncrypted,'Not encrypted','warn',()=>security.notEncrypted&&drill('encryption','Encryption','false')],[security.unknownEncryption,'Encryption status unknown','warn',()=>security.unknownEncryption&&drill('encryption','Encryption','Unknown')],[security.rooted,'Jailbroken / rooted','bad',undefined]]}/></Card>
      </div>
    </DashboardSection>

    <DashboardSection icon="activity" title="Inventory & Activity" subtitle="Inventory freshness, device activity and data-quality signals.">
      <div className="extendedInsightGrid inventoryActivityGrid">
        <Card title="Check-in age" subtitle="Time since the most recent Intune check-in"><Distribution rows={staleBuckets} total={total}/></Card>
        <Card title="Enrollment age" subtitle="Time since the device was enrolled in Intune"><Distribution rows={enrollmentBuckets} total={total}/></Card>
        <Card title="Inventory quality" subtitle="Duplicate and incomplete inventory signals"><SignalList rows={inventoryQuality.map(([label,value])=>[value,label,value?'warn':'neutral',undefined])}/></Card>
      </div>
    </DashboardSection>

    <DashboardSection icon="fleet" title="Fleet & Hardware" subtitle="Platform distribution, form factor, manufacturers, models and hardware standardization.">
      <div className="extendedInsightGrid twoInsightGrid">
        <Card title="Device types" subtitle="Form factor inferred from inventory and known model families"><Distribution rows={types} total={total}/></Card>
        <Card title="Manufacturers" subtitle="Largest device vendors in the current scope"><Distribution rows={manufacturers} total={total} onClick={label=>drill('manufacturer','Manufacturer',label)}/></Card>
        <Card title="Models" subtitle="Most common reported models in the current scope"><Distribution rows={models} total={total} onClick={label=>drill('model','Model',label)}/></Card>
        {windows.length>0&&<PlatformCard platform="windows" title="Windows hardware" subtitle="Architecture and firmware inventory coverage"><Distribution rows={windowsArch} total={windows.length}/><div className="metricTiles"><Metric label="BIOS reported" value={fmt(bios)}/><Metric label="TPM reported" value={fmt(tpm)}/></div></PlatformCard>}
        {apple.length>0&&<PlatformCard platform="applemobile" title="iOS/iPadOS device family" subtitle="iPhone and iPad distribution"><Distribution rows={appleFamilies} total={apple.length}/></PlatformCard>}
        {macos.length>0&&<PlatformCard platform="macos" title="macOS architecture" subtitle="Apple Silicon and Intel architecture reported by inventory"><Distribution rows={macArch} total={macos.length}/></PlatformCard>}
        {linux.length>0&&<PlatformCard platform="linux" title="Linux architecture" subtitle="Reported processor architecture"><Distribution rows={linuxArch} total={linux.length}/></PlatformCard>}
      </div>
    </DashboardSection>

    <DashboardSection icon="users" title="Users & Ownership" subtitle="Primary-user coverage, device density and ownership state.">
      <div className="extendedInsightGrid twoInsightGrid">
        <Card title="User assignment" subtitle="Managed-device density for identified primary users"><Distribution rows={userDistribution} total={Math.max(total,userCounts.length)}/></Card>
        <Card title="Ownership" subtitle="Corporate, personal and other ownership states"><Distribution rows={ownership} total={total}/></Card>
      </div>
    </DashboardSection>

    <DashboardSection icon="lifecycle" title="Operating System & Lifecycle" subtitle="OS adoption, support lifecycle, update position and patch status.">
      <div className="extendedInsightGrid" style={{gridTemplateColumns:'1fr'}}>
        <Card title="OS release adoption" subtitle="Release diversity and dominant version per operating-system family"><div className="fragmentationList">{adoption.map(row=><div key={row.platform}><header><strong>{platformLabel[row.platform]||row.platform}</strong><span>{row.versions} version{row.versions===1?'':'s'}</span></header><div><span className="truncate">{row.topVersion}</span><b>{pct(row.topCount,row.devices)} on top version</b></div><i><b style={{width:pct(row.topCount,row.devices)}}/></i></div>)}</div></Card>
        {windows.length>0&&<WindowsLifecycle devices={windows} title="Windows lifecycle"/>}
      </div>
      <div className="extendedInsightGrid twoInsightGrid">
        {windows.length>0&&<PlatformCard platform="windows" title="Windows edition & servicing" subtitle="Edition mix and servicing signals"><Distribution rows={windowsSkus} total={windows.length}/><SignalList rows={[[windowsBehind,'Behind current build','bad',undefined],[windowsEditionReview,'Edition-dependent servicing','warn',undefined]]}/></PlatformCard>}
        {android.length>0&&<PlatformCard platform="android" title="Android security patch" subtitle="Reported security patch level and freshness"><Distribution rows={androidPatch} total={android.length}/><SignalList rows={[[androidOldPatch,'Patch older than 90 days','bad',undefined],[androidUnknownPatch,'Patch level not reported','warn',undefined]]}/></PlatformCard>}
      </div>
    </DashboardSection>

    <DashboardSection icon="management" title="Management & Enrollment" subtitle="Enrollment, management mode, supervision, join and management state.">
      <div className="extendedInsightGrid twoInsightGrid">
        <Card title="Managed by" subtitle="Management authority reported by the current inventory"><Distribution rows={managed} total={total}/></Card>
        {windows.length>0&&<PlatformCard platform="windows" title="Windows join type" subtitle="Microsoft Entra registration and join state"><Distribution rows={countValues(windows.map(joinType))} total={windows.length}/></PlatformCard>}
        {android.length>0&&<PlatformCard platform="android" title="Android management type" subtitle="COPE, COBO, Dedicated, BYOD and other reported modes"><Distribution rows={androidModes} total={android.length}/></PlatformCard>}
        {apple.length>0&&<PlatformCard platform="applemobile" title="iOS/iPadOS supervision" subtitle="Supervision state reported by Intune"><Distribution rows={appleSupervision} total={apple.length}/></PlatformCard>}
        {apple.length>0&&<PlatformCard platform="applemobile" title="iOS/iPadOS management certificate" subtitle="Time remaining on the Intune management certificate"><Distribution rows={appleCert} total={apple.length}/></PlatformCard>}
        {macos.length>0&&<PlatformCard platform="macos" title="macOS join & enrollment" subtitle="Identity and management-certificate state"><Distribution rows={macJoin} total={macos.length}/><Distribution rows={macCert} total={macos.length}/></PlatformCard>}
        {linux.length>0&&<PlatformCard platform="linux" title="Linux join state" subtitle="Reported Microsoft Entra registration or join state"><Distribution rows={linuxJoin} total={linux.length}/></PlatformCard>}
      </div>
    </DashboardSection>
  </>;
}

function certificateBuckets(devices:Device[]):Row[]{
  const rows:Row[]=[['Expired',0],['< 30 days',0],['30–90 days',0],['> 90 days',0],['Unknown',0]];
  for(const device of devices){const value=certExpiry(device);const remaining=value?daysUntil(value):null;if(remaining===null){rows[4][1]++;continue}if(remaining<0)rows[0][1]++;else if(remaining<30)rows[1][1]++;else if(remaining<=90)rows[2][1]++;else rows[3][1]++}
  return rows;
}

function Card({title,subtitle,children,tone}:{title:string;subtitle:string;children:React.ReactNode;tone?:SecurityTone}){return <article className={`dashboardCard extendedInsightCard${tone?` tone-${tone}`:''}`}><header className="dashboardCardHead insightCardHead"><div><h2>{title}</h2><p>{subtitle}</p></div></header>{children}</article>}
function PlatformCard({platform,title,subtitle,children}:{platform:string;title:string;subtitle:string;children:React.ReactNode}){return <article className="dashboardCard extendedInsightCard platformSpecificCard"><header className="dashboardCardHead insightCardHead"><PlatformLogo platform={platform}/><div><h2>{title}</h2><p>{subtitle}</p></div></header>{children}</article>}
function Distribution({rows,total,onClick}:{rows:Row[];total:number;onClick?:(label:string)=>void}){return <div className="distributionList">{rows.filter(([,n])=>n>0).slice(0,8).map(([label,n],i)=>{const body=<><span className={`distributionDot dot${i%6}`}/><span className="truncate" title={label}>{label}</span><strong>{fmt(n)}</strong><small>{pct(n,total)}</small><i><b style={{width:pct(n,total)}}/></i></>;return onClick?<button type="button" className="distributionAction" key={label} onClick={()=>onClick(label)}>{body}</button>:<div key={label}>{body}</div>})}</div>}
function Metric({label,value}:{label:string;value:string}){return <div className="metricTile"><span>{label}</span><strong>{value}</strong></div>}
function SignalList({rows}:{rows:[number,string,string,(()=>void)|undefined][]}){const visible=rows.filter(([n])=>n>0);return <div className="platformSignalList">{visible.length?visible.map(([n,label,tone,onClick])=>onClick?<button type="button" key={label} className={`${tone} signalAction`} onClick={onClick}><span>{label}</span><strong>{fmt(n)}</strong></button>:<div key={label} className={tone}><span>{label}</span><strong>{fmt(n)}</strong></div>):<div className="clear"><span>No attention signals detected in this scope</span><strong>✓</strong></div>}</div>}
function Donut({total,items,center,label}:{total:number;items:Row[];center:string;label:string}){let cursor=0;const stops=items.map(([,n],i)=>{const start=cursor;cursor+=total?n/total*100:0;return `var(--chart-${i%6}) ${start}% ${cursor}%`});return <div className="donut" style={{background:`conic-gradient(${stops.join(',')||'#e7eef7 0 100%'})`}}><div><strong>{center}</strong><span>{label}</span></div></div>}
function PlatformLogo({platform}:{platform:string}){const p=platformKey(platform);return <span className={`platformCardLogo platformCardLogo-${p}`} aria-hidden="true">{p==='windows'?<svg viewBox="0 0 24 24"><path d="M3 5.5 10.5 4v7H3V5.5Zm8.5-1.7L21 2v9h-9.5V3.8ZM3 12h7.5v8L3 18.5V12Zm8.5 0H21v10l-9.5-1.8V12Z" fill="currentColor"/></svg>:p==='android'?<svg viewBox="0 0 24 24"><path d="M7 9h10v8H7V9Zm2-3-1.5-2M15 6l1.5-2M5 10v5m14-5v5M9 17v3m6-3v3"/></svg>:p==='linux'?<svg viewBox="0 0 24 24"><path d="M12 3c-2.5 0-4 2.2-4 5.2 0 1.2-.4 2.1-1.1 3.2C5.8 13 5 15 5 17.2c0 2 1.5 3.8 3.4 3.8 1.3 0 2.4-.7 3.6-1.7 1.2 1 2.3 1.7 3.6 1.7 1.9 0 3.4-1.8 3.4-3.8 0-2.2-.8-4.2-1.9-5.8-.7-1.1-1.1-2-1.1-3.2C16 5.2 14.5 3 12 3Z"/><circle cx="10.2" cy="8" r=".7" fill="currentColor"/><circle cx="13.8" cy="8" r=".7" fill="currentColor"/></svg>:<svg viewBox="0 0 24 24"><path d="M15.5 7.2c-.9-1.1-2.3-1.9-3.7-1.9-2.1 0-3.6 1.2-4.6 1.2-1.1 0-2.5-1.1-4.2-1-2.2 0-4.2 1.3-5.3 3.2-2.3 4-.6 9.8 1.6 13 .9 1.3 2 2.8 3.4 2.7 1.3-.1 1.9-.9 3.5-.9 1.7 0 2.2.9 3.6.9 1.5 0 2.4-1.3 3.3-2.6 1-1.5 1.5-3 1.5-3.1-.1 0-2.9-1.1-3-4.4 0-2.8 2.3-4.2 2.4-4.3-1.3-1.9-3.3-2.1-4-2.2Zm-1.4-3.9c.8-1 1.4-2.4 1.2-3.8-1.2.1-2.7.8-3.5 1.8-.8.9-1.5 2.3-1.3 3.7 1.4.1 2.8-.7 3.6-1.7Z" transform="translate(3 1) scale(.75)" fill="currentColor"/></svg>}</span>}