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
function platformDevices(allDevices:Device[],selectedPlatform:string|null,target:string,currentScope:Device[]){if(selectedPlatform)return selectedPlatform===target?currentScope:[];return allDevices.filter(d=>platformKey(d.platform)===target)}

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
        <