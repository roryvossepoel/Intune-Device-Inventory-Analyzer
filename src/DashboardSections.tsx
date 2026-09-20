import DashboardSection from './DashboardSection';
import WindowsLifecycle from './WindowsLifecycle';
import EncryptionCard, { securityAttention } from './SecurityInsights';
import { getWindowsIntelligence } from './deviceIntelligence';
import { appleDeviceFamily, cellularCapability, hardwareType } from './hardwareClassification';
import type { Device } from './types';

type DrillField='compliance'|'osVersion'|'manufacturer'|'model'|'user'|'encryption'|'checkInAge'|'enrollmentAge'|'inventoryQuality'|'deviceType'|'appleDeviceFamily'|'cellularCapability'|'primaryUser'|'userDensity'|'ownership';
type Drill=(field:DrillField,label:string,value:string)=>void;
type Row=[string,number];
type SecurityTone='good'|'warn'|'bad';

const fmt=(n:number)=>n.toLocaleString();
const pct=(n:number,total:number)=>{const value=total?n/total*100:0;const rounded=Math.round(value*10)/10;return `${Number.isInteger(rounded)?rounded.toFixed(0):rounded.toFixed(1)}%`};
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
function supervision(device:Device){const value=rawValue(device,[/^Supervised$/i]);if(/^true$/i.test(value))return 'Supervised';if(/^false$/i.test(value))return 'Not supervised';return 'Unknown'}

function platformDevices(allDevices:Device[],selectedPlatform:string|null,target:string,currentScope:Device[]){
  if(selectedPlatform)return selectedPlatform===target?currentScope:[];
  return allDevices.filter(d=>platformKey(d.platform)===target);
}

function versionParts(label:string){const values=label.match(/\d+/g)?.map(Number)??[];return values.length?values:[-1]}
function compareVersion(a:string,b:string){
  const av=versionParts(a);const bv=versionParts(b);const length=Math.max(av.length,bv.length);
  for(let i=0;i<length;i++){const difference=(av[i]??0)-(bv[i]??0);if(difference)return difference}
  return 0;
}
function versionPositionRows(rows:Row[]):Row[]{
  const unknown=rows.filter(([label])=>/^unknown$/i.test(label)).reduce((sum,[,count])=>sum+count,0);
  const known=rows.filter(([label])=>!/^unknown$/i.test(label)).sort((a,b)=>compareVersion(b[0],a[0]));
  return [
    ['Newest observed version',known[0]?.[1]??0],
    ['1 version behind',known[1]?.[1]??0],
    ['Older versions',known.slice(2).reduce((sum,[,count])=>sum+count,0)],
    ['Unknown',unknown]
  ];
}
function versionCount(rows:Row[]){return rows.filter(([label])=>!/^unknown$/i.test(label)).length}
function hasKnownRows(rows:Row[]){return rows.some(([label,count])=>count>0&&!/^unknown$/i.test(label)&&!/^other \/ unknown$/i.test(label))}

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
    ['90+ days',devices.filter(d=>{const age=daysSince(d.lastCheckIn);return age!==null&&age>90}).length],
    ['Unknown',devices.filter(d=>daysSince(d.lastCheckIn)===null).length]
  ];
  const enrollmentBuckets:Row[]=[
    ['0–30 days',devices.filter(d=>{const age=daysOld(enrollmentDate(d));return age!==null&&age<=30}).length],
    ['31–90 days',devices.filter(d=>{const age=daysOld(enrollmentDate(d));return age!==null&&age>30&&age<=90}).length],
    ['91–365 days',devices.filter(d=>{const age=daysOld(enrollmentDate(d));return age!==null&&age>90&&age<=365}).length],
    ['1+ year',devices.filter(d=>{const age=daysOld(enrollmentDate(d));return age!==null&&age>365}).length],
    ['Unknown',devices.filter(d=>daysOld(enrollmentDate(d))===null).length]
  ];
  const serials=devices.map(d=>d.serialNumber?.trim()).filter((v):v is string=>!!v);
  const names=devices.map(d=>d.deviceName?.trim()).filter((v):v is string=>!!v);
  const serialCounts=countValues(serials);
  const nameCounts=countValues(names);
  const duplicateSerialValues=new Set(serialCounts.filter(([,n])=>n>1).map(([value])=>value));
  const duplicateNameValues=new Set(nameCounts.filter(([,n])=>n>1).map(([value])=>value));
  const duplicateSerials=serialCounts.filter(([,n])=>n>1).reduce((sum,[,n])=>sum+n,0);
  const duplicateNames=nameCounts.filter(([,n])=>n>1).reduce((sum,[,n])=>sum+n,0);
  const inventoryQuality:Row[]=[
    ['Duplicate serial entries',duplicateSerials],
    ['Duplicate device names',duplicateNames],
    ['Missing serial number',total-serials.length],
    ['Missing manufacturer',devices.filter(d=>!d.manufacturer?.trim()).length],
    ['Missing model',devices.filter(d=>!d.model?.trim()).length],
    ['Unknown platform',devices.filter(d=>d.platform==='unknown').length],
    ['Missing / invalid last check-in',devices.filter(d=>daysSince(d.lastCheckIn)===null).length]
  ];
  const inventoryQualityAffected=devices.filter(device=>{
    const serial=device.serialNumber?.trim();
    const name=device.deviceName?.trim();
    return (!!serial&&duplicateSerialValues.has(serial))||
      (!!name&&duplicateNameValues.has(name))||
      !serial||
      !device.manufacturer?.trim()||
      !device.model?.trim()||
      device.platform==='unknown'||
      daysSince(device.lastCheckIn)===null;
  }).length;

  const manufacturers=countValues(devices.map(d=>clean(d.manufacturer))).filter(([label])=>label!=='Unknown');
  const models=countValues(devices.map(d=>clean(d.model))).filter(([label])=>label!=='Unknown');
  const types=countValues(devices.map(hardwareType));
  const ownership=countValues(devices.map(d=>clean(d.ownership)));
  const userCounts=countValues(devices.map(d=>clean(d.userUpn||d.userDisplayName)).filter(v=>v!=='Unknown'));
  const noPrimaryUser=devices.filter(d=>!d.userUpn&&!d.userDisplayName).length;
  const identifiedUsers=userCounts.length;
  const primaryUserCoverage:Row[]=[['Primary user assigned',Math.max(0,total-noPrimaryUser)],['No primary user',noPrimaryUser]];
  const userDensity:Row[]=[
    ['1 device',userCounts.filter(([,n])=>n===1).length],
    ['2 devices',userCounts.filter(([,n])=>n===2).length],
    ['3 devices',userCounts.filter(([,n])=>n===3).length],
    ['4 devices',userCounts.filter(([,n])=>n===4).length],
    ['5+ devices',userCounts.filter(([,n])=>n>=5).length]
  ];

  const windowsVersions=countValues(windows.map(d=>clean(d.osVersion)));
  const androidVersions=countValues(android.map(d=>clean(d.osVersion)));
  const appleVersions=countValues(apple.map(d=>clean(d.osVersion)));
  const macosVersions=countValues(macos.map(d=>clean(d.osVersion)));
  const linuxVersions=countValues(linux.map(d=>clean(d.osVersion)));
  const applePosition=versionPositionRows(appleVersions);
  const macPosition=versionPositionRows(macosVersions);

  const windowsSkus=countValues(windows.map(sku));
  const windowsArch=countValues(windows.map(architecture));
  const windowsOwnership=countValues(windows.map(d=>clean(d.ownership)));
  const windowsJoin=countValues(windows.map(joinType));
  const windowsManaged=countValues(windows.map(managedBy));
  const windowsBehind=windows.filter(d=>getWindowsIntelligence(d.osVersion)?.updateHealth==='behind').length;
  const windowsEditionReview=windows.filter(d=>getWindowsIntelligence(d.osVersion)?.updateHealth==='edition-review').length;

  const androidPatchFreshness:Row[]=[
    ['≤ 30 days',android.filter(d=>{const age=daysOld(patchLevel(d));return age!==null&&age<=30}).length],
    ['31–60 days',android.filter(d=>{const age=daysOld(patchLevel(d));return age!==null&&age>30&&age<=60}).length],
    ['61–90 days',android.filter(d=>{const age=daysOld(patchLevel(d));return age!==null&&age>60&&age<=90}).length],
    ['> 90 days',android.filter(d=>{const age=daysOld(patchLevel(d));return age!==null&&age>90}).length],
    ['Unknown',android.filter(d=>!patchLevel(d)).length]
  ];
  const androidOldPatch=androidPatchFreshness.find(([label])=>label==='> 90 days')?.[1]??0;
  const androidUnknownPatch=androidPatchFreshness.find(([label])=>label==='Unknown')?.[1]??0;
  const androidModes=countValues(android.map(androidMode));
  const androidCellular=countValues(android.map(cellularCapability));

  const appleFamilies=countValues(apple.map(appleDeviceFamily));
  const appleCellular=countValues(apple.map(cellularCapability));
  const appleSupervision=countValues(apple.map(supervision));
  const macArch=countValues(macos.map(architecture));
  const macJoin=countValues(macos.map(joinType));
  const macCert=certificateBuckets(macos);
  const linuxArch=countValues(linux.map(architecture));
  const linuxJoin=countValues(linux.map(joinType));

  const knownPlatforms=windows.length+android.length+apple.length+macos.length+linux.length;
  const osBreakdown:Row[]=[
    ['Windows',windows.length],
    ['Android',android.length],
    ['iOS / iPadOS',apple.length],
    ['macOS',macos.length],
    ['Linux',linux.length],
    ['Other / Unknown',Math.max(0,total-knownPlatforms)]
  ];
  const versionSpread:Row[]=[
    ['Windows',versionCount(windowsVersions)],
    ['Android',versionCount(androidVersions)],
    ['iOS / iPadOS',versionCount(appleVersions)],
    ['macOS',versionCount(macosVersions)],
    ['Linux',versionCount(linuxVersions)]
  ];
  const appleBehind=(applePosition[1]?.[1]??0)+(applePosition[2]?.[1]??0);
  const macBehind=(macPosition[1]?.[1]??0)+(macPosition[2]?.[1]??0);
  const osAttention:[number,string,string,(()=>void)|undefined][]=[
    [windowsBehind+windowsEditionReview,'Windows servicing attention','warn',undefined],
    [androidOldPatch+androidUnknownPatch,'Android patch attention','warn',undefined],
    [appleBehind,'iOS/iPadOS behind newest observed','warn',undefined],
    [macBehind,'macOS behind newest observed','warn',undefined],
    [Math.max(0,total-knownPlatforms),'Unknown operating system','warn',undefined]
  ];

  return <>
    <DashboardSection icon="security" title="Health & Security" subtitle="Compliance, protection and security signals across the managed inventory.">
      <div className="dashboardMainGrid securityMainGrid">
        <Card title="Compliance status" subtitle="Current device compliance state" tone={complianceTone}><Donut total={total} items={compliance} center={`${compliancePct.toFixed(1)}%`} label="compliant"/><Distribution rows={compliance} total={total} onClick={label=>drill('compliance','Compliance',label)}/></Card>
        <EncryptionCard devices={devices} onEncrypted={()=>drill('encryption','Encryption','true')} onNotEncrypted={()=>security.notEncrypted&&drill('encryption','Encryption','false')} onUnknown={()=>security.unknownEncryption&&drill('encryption','Encryption','Unknown')}/>
        <Card title="Security attention" subtitle="Explicit security signals requiring review" tone={securityTone}><SignalList rows={[[security.notEncrypted,'Not encrypted','warn',()=>security.notEncrypted&&drill('encryption','Encryption','false')],[security.unknownEncryption,'Encryption status unknown','warn',()=>security.unknownEncryption&&drill('encryption','Encryption','Unknown')],[security.rooted,'Jailbroken / rooted','bad',undefined]]}/></Card>
      </div>
    </DashboardSection>

    <DashboardSection icon="activity" title="Inventory & Activity" subtitle="Inventory freshness, device activity and data-quality signals.">
      <div className="extendedInsightGrid inventoryActivityGrid">
        <Card title="Check-in age" subtitle="Time since last Intune check-in"><Distribution rows={staleBuckets} total={total} onClick={label=>drill('checkInAge','Check-in age',label)}/></Card>
        <Card title="Enrollment age" subtitle="Time since enrollment in Intune"><Distribution rows={enrollmentBuckets} total={total} onClick={label=>drill('enrollmentAge','Enrollment age',label)}/></Card>
        <Card title="Inventory quality" subtitle="Duplicate and incomplete inventory signals"><div className="inventoryQualitySummary"><strong>{fmt(inventoryQualityAffected)}</strong><span>{inventoryQualityAffected===1?'device needs':'devices need'} data-quality review</span></div><SignalList rows={inventoryQuality.map(([label,value])=>[value,label,value?'warn':'neutral',value?()=>drill('inventoryQuality','Inventory quality',label):undefined])}/></Card>
      </div>
    </DashboardSection>

    <DashboardSection icon="fleet" title="Fleet & Hardware" subtitle="Cross-platform form factor, vendor and model overview.">
      <div className="extendedInsightGrid twoInsightGrid">
        <Card title="Device types" subtitle="Form factor inferred from inventory and known model families"><Distribution rows={types} total={total} onClick={label=>drill('deviceType','Device type',label)}/></Card>
        <Card title="Manufacturers" subtitle="Largest device vendors in the current scope"><Distribution rows={manufacturers} total={total} limit={6} onClick={label=>drill('manufacturer','Manufacturer',label)}/>{manufacturers.length>6&&<ListCoverageNote shown={6} total={manufacturers.length} label="manufacturers"/>}</Card>
        <Card title="Models" subtitle="Most common reported models in the current scope"><Distribution rows={models} total={total} limit={8} onClick={label=>drill('model','Model',label)}/>{models.length>8&&<ListCoverageNote shown={8} total={models.length} label="models"/>}</Card>
      </div>
    </DashboardSection>

    <DashboardSection icon="users" title="Users & Ownership" subtitle="Primary-user coverage, device density and ownership state.">
      <div className="extendedInsightGrid usersOwnershipGrid">
        <Card className="usersPrimaryCoverageCard" title="Primary user coverage" subtitle="Devices with an identified primary user"><div className="usersDonutLayout"><Donut total={total} items={primaryUserCoverage} center={fmt(total)} label="devices"/><Distribution rows={primaryUserCoverage} total={total} onClick={label=>drill('primaryUser','Primary user',label==='Primary user assigned'?'Has primary user':'No primary user')}/></div></Card>
        {identifiedUsers>0&&<Card className="usersDensityCard" title="Devices per user" subtitle="Distribution across identified primary users"><Distribution rows={userDensity} total={identifiedUsers} limit={5} showZero onClick={label=>drill('userDensity','Devices per user',label)}/></Card>}
        <Card className="usersOwnershipCard" title="Ownership" subtitle="Corporate, personal and other ownership states"><div className="usersDonutLayout"><Donut total={total} items={ownership} center={fmt(total)} label="devices"/><Distribution rows={ownership} total={total} onClick={label=>drill('ownership','Ownership',label)}/></div></Card>
      </div>
    </DashboardSection>

    <DashboardSection icon="lifecycle" title="Operating Systems" subtitle="Cross-platform operating system distribution, fragmentation and attention signals.">
      <div className="dashboardMainGrid osOverviewGrid">
        <Card title="OS breakdown" subtitle="Device distribution across operating-system families"><div className="hardwareDonutLayout"><Donut total={total} items={osBreakdown} center={fmt(total)} label="devices"/><Distribution rows={osBreakdown} total={total}/></div></Card>
        <Card title="Version fragmentation" subtitle="Distinct reported OS versions by platform; higher counts indicate more fragmentation"><MetricList rows={versionSpread}/></Card>
        <Card title="OS attention" subtitle="Devices with platform-specific update, patch or lifecycle signals"><SignalList rows={osAttention}/></Card>
      </div>
    </DashboardSection>

    {windows.length>0&&<DashboardSection icon="lifecycle" title="Windows" subtitle={`${fmt(windows.length)} Windows devices · lifecycle, edition, architecture, ownership and management intelligence.`} className="platformCategory platformCategory-windows">
      <div className="extendedInsightGrid windowsLifecycleGrid" style={{gridTemplateColumns:'1fr'}}><WindowsLifecycle devices={windows} title="Windows lifecycle"/></div>
      <div className="extendedInsightGrid twoInsightGrid windowsSummaryGrid">
        {hasKnownRows(windowsSkus)&&<PlatformCard className="windowsCompositionCard windowsEditionCard" platform="windows" title="Windows edition" subtitle="Reported Windows edition mix"><div className="hardwareDonutLayout"><Donut total={windows.length} items={windowsSkus} center={fmt(windows.length)} label="devices"/><Distribution rows={windowsSkus} total={windows.length}/></div></PlatformCard>}
        {hasKnownRows(windowsArch)&&<PlatformCard className="windowsCompositionCard windowsArchitectureCard" platform="windows" title="Windows architecture" subtitle="Processor architecture across Windows devices"><div className="hardwareDonutLayout"><Donut total={windows.length} items={windowsArch} center={fmt(windows.length)} label="devices"/><Distribution rows={windowsArch} total={windows.length}/></div></PlatformCard>}
        {hasKnownRows(windowsOwnership)&&<PlatformCard className="windowsCompositionCard windowsOwnershipCard" platform="windows" title="Ownership" subtitle="Company and Personal Windows devices"><div className="hardwareDonutLayout"><Donut total={windows.length} items={windowsOwnership} center={fmt(windows.length)} label="devices"/><Distribution rows={windowsOwnership} total={windows.length}/></div></PlatformCard>}
        {hasKnownRows(windowsJoin)&&<PlatformCard className="windowsCompositionCard windowsJoinTypeCard" platform="windows" title="Windows join type" subtitle="Microsoft Entra registration and join state"><div className="hardwareDonutLayout"><Donut total={windows.length} items={windowsJoin} center={fmt(windows.length)} label="devices"/><Distribution rows={windowsJoin} total={windows.length}/></div></PlatformCard>}
        {hasKnownRows(windowsManaged)&&<PlatformCard className="windowsCompositionCard windowsManagedByCard" platform="windows" title="Managed by" subtitle="Management agent reported for Windows devices"><div className="hardwareDonutLayout"><Donut total={windows.length} items={windowsManaged} center={fmt(windows.length)} label="devices"/><Distribution rows={windowsManaged} total={windows.length}/></div></PlatformCard>}
      </div>
    </DashboardSection>}

    {android.length>0&&<DashboardSection icon="lifecycle" title="Android" subtitle={`${fmt(android.length)} Android devices · versions, patch freshness, hardware and management intelligence.`} className="platformCategory platformCategory-android">
      <div className="extendedInsightGrid twoInsightGrid">
        <PlatformCard className="osVersionCard" platform="android" title="Android versions" subtitle={`${fmt(android.length)} devices · ${androidVersions.length} reported version${androidVersions.length===1?'':'s'}`}><Distribution rows={androidVersions} total={android.length} limit={androidVersions.length} onClick={label=>drill('osVersion','OS version',label)}/></PlatformCard>
        {hasKnownRows(androidPatchFreshness)&&<PlatformCard platform="android" title="Security patch freshness" subtitle="Age of the reported Android security patch level"><Distribution rows={androidPatchFreshness} total={android.length}/></PlatformCard>}
        {hasKnownRows(androidCellular)&&<PlatformCard platform="android" title="Cellular capability" subtitle="Cellular support reported for Android devices"><div className="hardwareDonutLayout"><Donut total={android.length} items={androidCellular} center={fmt(android.length)} label="devices"/><Distribution rows={androidCellular} total={android.length}/></div></PlatformCard>}
        {hasKnownRows(androidModes)&&<PlatformCard platform="android" title="Android management type" subtitle="COPE, COBO, Dedicated, BYOD and other reported modes"><Distribution rows={androidModes} total={android.length}/></PlatformCard>}
      </div>
    </DashboardSection>}

    {apple.length>0&&<DashboardSection icon="lifecycle" title="iOS / iPadOS" subtitle={`${fmt(apple.length)} Apple mobile devices · versions, hardware and management intelligence.`} className="platformCategory platformCategory-applemobile">
      <div className="extendedInsightGrid twoInsightGrid">
        <PlatformCard className="osVersionCard" platform="applemobile" title="iOS/iPadOS versions" subtitle={`${fmt(apple.length)} devices · ${appleVersions.length} reported version${appleVersions.length===1?'':'s'}`}><Distribution rows={appleVersions} total={apple.length} limit={appleVersions.length} onClick={label=>drill('osVersion','OS version',label)}/></PlatformCard>
        <PlatformCard platform="applemobile" title="Version position" subtitle="Relative to the newest version observed in this inventory"><Distribution rows={applePosition} total={apple.length}/></PlatformCard>
        {hasKnownRows(appleFamilies)&&<PlatformCard platform="applemobile" title="Device family" subtitle="iPhone and iPad distribution"><div className="hardwareDonutLayout"><Donut total={apple.length} items={appleFamilies} center={fmt(apple.length)} label="devices"/><Distribution rows={appleFamilies} total={apple.length} onClick={label=>drill('appleDeviceFamily','Device family',label)}/></div></PlatformCard>}
        {hasKnownRows(appleCellular)&&<PlatformCard platform="applemobile" title="Cellular capability" subtitle="Cellular support reported for iPhone and iPad devices"><div className="hardwareDonutLayout"><Donut total={apple.length} items={appleCellular} center={fmt(apple.length)} label="devices"/><Distribution rows={appleCellular} total={apple.length}/></div></PlatformCard>}
        {hasKnownRows(appleSupervision)&&<PlatformCard platform="applemobile" title="Supervision" subtitle="Supervision state reported by Intune"><Distribution rows={appleSupervision} total={apple.length}/></PlatformCard>}
      </div>
    </DashboardSection>}

    {macos.length>0&&<DashboardSection icon="lifecycle" title="macOS" subtitle={`${fmt(macos.length)} macOS devices · versions, architecture and management intelligence.`} className="platformCategory platformCategory-macos">
      <div className="extendedInsightGrid twoInsightGrid">
        <PlatformCard className="osVersionCard" platform="macos" title="macOS versions" subtitle={`${fmt(macos.length)} devices · ${macosVersions.length} reported version${macosVersions.length===1?'':'s'}`}><Distribution rows={macosVersions} total={macos.length} limit={macosVersions.length} onClick={label=>drill('osVersion','OS version',label)}/></PlatformCard>
        <PlatformCard platform="macos" title="Version position" subtitle="Relative to the newest version observed in this inventory"><Distribution rows={macPosition} total={macos.length}/></PlatformCard>
        {hasKnownRows(macArch)&&<PlatformCard platform="macos" title="Architecture" subtitle="Apple Silicon and Intel architecture reported by inventory"><Distribution rows={macArch} total={macos.length}/></PlatformCard>}
        {(hasKnownRows(macJoin)||hasKnownRows(macCert))&&<PlatformCard platform="macos" title="Join & enrollment" subtitle="Identity and management-certificate state">{hasKnownRows(macJoin)&&<><span className="platformSubLabel">Join state</span><Distribution rows={macJoin} total={macos.length}/></>}{hasKnownRows(macCert)&&<><span className="platformSubLabel">Management certificate</span><Distribution rows={macCert} total={macos.length}/></>}</PlatformCard>}
      </div>
    </DashboardSection>}

    {linux.length>0&&<DashboardSection icon="lifecycle" title="Linux" subtitle={`${fmt(linux.length)} Linux devices · versions, architecture and management intelligence.`} className="platformCategory platformCategory-linux">
      <div className="extendedInsightGrid twoInsightGrid">
        <PlatformCard className="osVersionCard" platform="linux" title="Linux versions" subtitle={`${fmt(linux.length)} devices · ${linuxVersions.length} reported version${linuxVersions.length===1?'':'s'}`}><Distribution rows={linuxVersions} total={linux.length} limit={linuxVersions.length} onClick={label=>drill('osVersion','OS version',label)}/></PlatformCard>
        {hasKnownRows(linuxArch)&&<PlatformCard platform="linux" title="Architecture" subtitle="Reported processor architecture"><Distribution rows={linuxArch} total={linux.length}/></PlatformCard>}
        {hasKnownRows(linuxJoin)&&<PlatformCard platform="linux" title="Join state" subtitle="Reported Microsoft Entra registration or join state"><Distribution rows={linuxJoin} total={linux.length}/></PlatformCard>}
      </div>
    </DashboardSection>}
  </>;
}

function certificateBuckets(devices:Device[]):Row[]{
  const rows:Row[]=[['Expired',0],['< 30 days',0],['30–90 days',0],['> 90 days',0],['Unknown',0]];
  for(const device of devices){const value=certExpiry(device);const remaining=value?daysUntil(value):null;if(remaining===null){rows[4][1]++;continue}if(remaining<0)rows[0][1]++;else if(remaining<30)rows[1][1]++;else if(remaining<=90)rows[2][1]++;else rows[3][1]++}
  return rows;
}

function Card({title,subtitle,children,tone,className=''}:{title:string;subtitle:string;children:React.ReactNode;tone?:SecurityTone;className?:string}){return <article className={`dashboardCard extendedInsightCard${tone?` tone-${tone}`:''}${className?` ${className}`:''}`}><header className="dashboardCardHead insightCardHead"><div><h2>{title}</h2><p>{subtitle}</p></div></header>{children}</article>}
function PlatformCard({platform,title,subtitle,children,className=''}:{platform:string;title:string;subtitle:string;children:React.ReactNode;className?:string}){return <article className={`dashboardCard extendedInsightCard platformSpecificCard${className?` ${className}`:''}`}><header className="dashboardCardHead insightCardHead"><PlatformLogo platform={platform}/><div><h2>{title}</h2><p>{subtitle}</p></div></header>{children}</article>}
function Distribution({rows,total,onClick,limit=8,showZero=false}:{rows:Row[];total:number;onClick?:(label:string)=>void;limit?:number;showZero?:boolean}){const visible=(showZero?rows:rows.filter(([,n])=>n>0)).slice(0,limit);return <div className="distributionList">{visible.map(([label,n],i)=>{const body=<><span className={`distributionDot dot${i%6}`}/><span className="truncate" title={label}>{label}</span><strong>{fmt(n)}</strong><small>{pct(n,total)}</small><i><b style={{width:pct(n,total)}}/></i></>;return onClick&&n>0?<button type="button" className="distributionAction" key={label} onClick={()=>onClick(label)}>{body}</button>:<div key={label}>{body}</div>})}</div>}
function MetricList({rows}:{rows:Row[]}){const visible=rows.filter(([,n])=>n>0);return <div className="platformSignalList">{visible.map(([label,n])=><div key={label} className="neutral"><span>{label}</span><strong>{fmt(n)}</strong></div>)}</div>}
function ListCoverageNote({shown,total,label}:{shown:number;total:number;label:string}){return <p className="dashboardListNote">Showing top {Math.min(shown,total)} of {fmt(total)} {label}. Use Device Explorer for the complete list.</p>}
function SignalList({rows}:{rows:[number,string,string,(()=>void)|undefined][]}){const visible=rows.filter(([n])=>n>0);return <div className="platformSignalList">{visible.length?visible.map(([n,label,tone,onClick])=>onClick?<button type="button" key={label} className={`${tone} signalAction`} onClick={onClick}><span>{label}</span><strong>{fmt(n)}</strong></button>:<div key={label} className={tone}><span>{label}</span><strong>{fmt(n)}</strong></div>):<div className="clear"><span>No attention signals detected in this scope</span><strong>✓</strong></div>}</div>}
function Donut({total,items,center,label}:{total:number;items:Row[];center:string;label:string}){let cursor=0;const stops=items.map(([,n],i)=>{const start=cursor;cursor+=total?n/total*100:0;return `var(--chart-${i%6}) ${start}% ${cursor}%`});return <div className="donut" style={{background:`conic-gradient(${stops.join(',')||'#e7eef7 0 100%'})`}}><div><strong>{center}</strong><span>{label}</span></div></div>}
function PlatformLogo({platform}:{platform:string}){const p=platformKey(platform);return <span className={`platformCardLogo platformCardLogo-${p}`} aria-hidden="true">{p==='windows'?<svg viewBox="0 0 24 24"><path d="M3 5.5 10.5 4v7H3V5.5Zm8.5-1.7L21 2v9h-9.5V3.8ZM3 12h7.5v8L3 18.5V12Zm8.5 0H21v10l-9.5-1.8V12Z" fill="currentColor"/></svg>:p==='android'?<svg viewBox="0 0 24 24"><path d="M7 9h10v8H7V9Zm2-3-1.5-2M15 6l1.5-2M5 10v5m14-5v5M9 17v3m6-3v3"/></svg>:p==='cellular'?<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="10" height="18" rx="2"/><path d="M8 17h2M17 16v3M20 12v7"/></svg>:p==='linux'?<svg viewBox="0 0 24 24"><path d="M12 3c-2.5 0-4 2.2-4 5.2 0 1.2-.4 2.1-1.1 3.2C5.8 13 5 15 5 17.2c0 2 1.5 3.8 3.4 3.8 1.3 0 2.4-.7 3.6-1.7 1.2 1 2.3 1.7 3.6 1.7 1.9 0 3.4-1.8 3.4-3.8 0-2.2-.8-4.2-1.9-5.8-.7-1.1-1.1-2-1.1-3.2C16 5.2 14.5 3 12 3Z"/><circle cx="10.2" cy="8" r=".7" fill="currentColor"/><circle cx="13.8" cy="8" r=".7" fill="currentColor"/></svg>:<svg viewBox="0 0 24 24"><path d="M15.5 7.2c-.9-1.1-2.3-1.9-3.7-1.9-2.1 0-3.6 1.2-4.6 1.2-1.1 0-2.5-1.1-4.2-1-2.2 0-4.2 1.3-5.3 3.2-2.3 4-.6 9.8 1.6 13 .9 1.3 2 2.8 3.4 2.7 1.3-.1 1.9-.9 3.5-.9 1.7 0 2.2.9 3.6.9 1.5 0 2.4-1.3 3.3-2.6 1-1.5 1.5-3 1.5-3.1-.1 0-2.9-1.1-3-4.4 0-2.8 2.3-4.2 2.4-4.3-1.3-1.9-3.3-2.1-4-2.2Zm-1.4-3.9c.8-1 1.4-2.4 1.2-3.8-1.2.1-2.7.8-3.5 1.8-.8.9-1.5 2.3-1.3 3.7 1.4.1 2.8-.7 3.6-1.7Z" transform="translate(3 1) scale(.75)" fill="currentColor"/></svg>}</span>}
