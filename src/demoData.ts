import { describeOsVersion } from './deviceIntelligence';
import { resolveDeviceModel } from './deviceModelLookup';
import type { Device, ImportResult, PlatformFamily } from './types';

type Template={platform:PlatformFamily;manufacturer:string;model:string;os:string;versions:string[];weight:number;productName?:string;architecture?:string};
const templates:Template[]=[
  {platform:'windows',manufacturer:'Dell',model:'Dell Pro 16 PC16250',os:'Windows',versions:['10.0.26200.9106','10.0.26200.8893'],weight:10},
  {platform:'windows',manufacturer:'Dell',model:'Latitude 3550',os:'Windows',versions:['10.0.26200.9106','10.0.26100.9106'],weight:7},
  {platform:'windows',manufacturer:'Dell',model:'OptiPlex 7020 Micro Plus',os:'Windows',versions:['10.0.26200.9106','10.0.26100.9106'],weight:5},
  {platform:'windows',manufacturer:'HP',model:'EliteBook 840 G11',os:'Windows',versions:['10.0.26200.9106','10.0.26200.8893'],weight:8},
  {platform:'windows',manufacturer:'HP',model:'ProBook 440 G11',os:'Windows',versions:['10.0.26200.9106','10.0.26100.9106'],weight:5},
  {platform:'windows',manufacturer:'HP',model:'Elite Mini 800 G9',os:'Windows',versions:['10.0.26200.9106','10.0.26100.9106'],weight:4},
  {platform:'windows',manufacturer:'Lenovo',model:'ThinkPad T14 Gen 5',os:'Windows',versions:['10.0.26200.9106','10.0.26100.9106'],weight:8},
  {platform:'windows',manufacturer:'Lenovo',model:'ThinkBook 16 G7',os:'Windows',versions:['10.0.26200.9106','10.0.26200.8893'],weight:5},
  {platform:'windows',manufacturer:'Lenovo',model:'ThinkCentre M75q Gen 5',os:'Windows',versions:['10.0.26200.9106','10.0.26100.9106'],weight:4},
  {platform:'windows',manufacturer:'Microsoft',model:'Surface Laptop 7',os:'Windows',versions:['10.0.26200.9106','10.0.26200.8893'],weight:7},
  {platform:'windows',manufacturer:'Microsoft',model:'Surface Pro 11',os:'Windows',versions:['10.0.26200.9106','10.0.26100.9106'],weight:5},
  {platform:'windows',manufacturer:'Microsoft',model:'Surface Laptop 5',os:'Windows',versions:['10.0.22631.7517'],weight:3},

  {platform:'macos',manufacturer:'Apple',model:'MacBook Air 13-inch (M3)',os:'macOS',versions:['26.6.1','26.6'],weight:5,architecture:'ARM64'},
  {platform:'macos',manufacturer:'Apple',model:'MacBook Air 15-inch (M4)',os:'macOS',versions:['26.6.1','26.5'],weight:4,architecture:'ARM64'},
  {platform:'macos',manufacturer:'Apple',model:'MacBook Pro 14-inch (M4)',os:'macOS',versions:['26.6.1','26.5'],weight:3,architecture:'ARM64'},
  {platform:'macos',manufacturer:'Apple',model:'MacBook Pro 13-inch (2020, Intel)',os:'macOS',versions:['26.6','26.5'],weight:2,architecture:'X64'},

  {platform:'ios',manufacturer:'Apple',model:'iPhone',os:'iOS/iPadOS',versions:['26.6.1','26.6'],weight:8,productName:'iPhone17,5'},
  {platform:'ios',manufacturer:'Apple',model:'iPhone',os:'iOS/iPadOS',versions:['26.6.1','26.6'],weight:6,productName:'iPhone17,3'},
  {platform:'ios',manufacturer:'Apple',model:'iPhone',os:'iOS/iPadOS',versions:['26.6.1','26.5.2'],weight:4,productName:'iPhone14,6'},
  {platform:'ipados',manufacturer:'Apple',model:'iPad',os:'iOS/iPadOS',versions:['26.6.1','26.6'],weight:6,productName:'iPad16,3'},
  {platform:'ipados',manufacturer:'Apple',model:'iPad',os:'iOS/iPadOS',versions:['26.6.1','26.6'],weight:5,productName:'iPad15,3'},
  {platform:'ipados',manufacturer:'Apple',model:'iPad',os:'iOS/iPadOS',versions:['26.6.1','26.5.2'],weight:4,productName:'iPad13,18'},

  {platform:'android',manufacturer:'Samsung',model:'SM-A566B',os:'Android (Corporate-Owned Work Profile)',versions:['16','15'],weight:8},
  {platform:'android',manufacturer:'Samsung',model:'SM-S931B',os:'Android (Corporate-Owned Work Profile)',versions:['16','15'],weight:5},
  {platform:'android',manufacturer:'Samsung',model:'SM-G556B',os:'Android (Fully Managed)',versions:['16','15'],weight:4},
  {platform:'android',manufacturer:'Google',model:'Pixel 9',os:'Android (Corporate-Owned Work Profile)',versions:['16','15'],weight:5},
  {platform:'android',manufacturer:'Google',model:'Pixel 9a',os:'Android (Corporate-Owned Work Profile)',versions:['16','15'],weight:4},
  {platform:'android',manufacturer:'Google',model:'Pixel Tablet',os:'Android (Dedicated)',versions:['16','15'],weight:2},
  {platform:'android',manufacturer:'Motorola',model:'Edge 60',os:'Android (Fully Managed)',versions:['16','15'],weight:4},
  {platform:'android',manufacturer:'Motorola',model:'Moto G75 5G',os:'Android (Corporate-Owned Work Profile)',versions:['16','15'],weight:3},
  {platform:'android',manufacturer:'Xiaomi',model:'Xiaomi 15',os:'Android (Corporate-Owned Work Profile)',versions:['16','15'],weight:3},
  {platform:'android',manufacturer:'Xiaomi',model:'Redmi Note 14 Pro 5G',os:'AOSP (User-based)',versions:['16','15'],weight:3},

  {platform:'linux',manufacturer:'Dell',model:'Latitude 7450',os:'Linux',versions:['Ubuntu 24.04 LTS','Ubuntu 22.04 LTS'],weight:2},
  {platform:'linux',manufacturer:'Lenovo',model:'ThinkPad T14 Gen 5',os:'Linux',versions:['Ubuntu 24.04 LTS','Ubuntu 22.04 LTS'],weight:2},
];

export const demoSourceColumns=[
  'Device ID','Device name','Enrollment date','Last check-in','Azure AD Device ID','OS version','Azure AD registered','EAS activation ID','Serial number','Manufacturer','Model','EAS activated','IMEI','Last EAS sync time','EAS reason','EAS status','Compliance grace period expiration','Security patch level','Wi-Fi MAC','MEID','Subscriber carrier','Total storage','Free storage','Management name','Category','UserId','Primary user UPN','Primary user email address','Primary user display name','WiFiIPv4Address','WiFiSubnetID','Compliance','Managed by','Ownership','Device state','Intune registered','Supervised','Encrypted','OS','SkuFamily','JoinType','Phone number','Jailbroken','ICCID','EthernetMAC','CellularTechnology','ProcessorArchitecture','EID','SystemManagementBIOSVersion','TPMManufacturerId','TPMManufacturerVersion','ProductName','Management certificate expiration date'
] as const;

const total=15462;
const now=Date.now();
const demoUserPoolSize=10500;
const allocated:Template[]=[];
for(const t of templates)for(let i=0;i<t.weight;i++)allocated.push(t);

function isoDaysAgo(days:number){return new Date(now-days*86400000).toISOString()}
function intuneDateDaysAgo(days:number){return new Date(now-days*86400000).toISOString().replace('T',' ').replace('Z','0000')}
function futureIntuneDate(days:number){return new Date(now+days*86400000).toISOString().replace('T',' ').replace('Z','0000')}
function compactHex(value:number,length:number){let s='';for(let i=0;i<length;i++)s+=((value*37+i*17)%16).toString(16).toUpperCase();return s}
function fakeGuid(i:number,salt:number){const a=(0x10000000+((i+1)*(salt+17)*7919)%0xefffffff).toString(16).padStart(8,'0').slice(-8);const b=((i+salt)*97%0xffff).toString(16).padStart(4,'0');const c=((i+salt*3)*131%0xffff).toString(16).padStart(4,'0');const d=((i+salt*5)*173%0xffff).toString(16).padStart(4,'0');const e=((BigInt(i+1)*BigInt(salt+29)*BigInt(104729))%BigInt('0xffffffffffff')).toString(16).padStart(12,'0');return `${a}-${b}-${c}-${d}-${e}`}
function rawManufacturer(name:string){return name==='Dell'?'Dell Inc.':name==='Microsoft'?'Microsoft Corporation':name==='Lenovo'?'LENOVO':name==='Samsung'?'samsung':name==='HP'?'HP':name}
function enrollmentAgeDays(i:number){
  const bucket=i%100;
  if(bucket<12)return 1+((i*7)%30);
  if(bucket<30)return 31+((i*11)%60);
  if(bucket<78)return 91+((i*13)%275);
  if(bucket<97)return 366+((i*17)%700);
  return null;
}
function demoUser(i:number){
  const userIndex=i%demoUserPoolSize;
  const number=String(userIndex+1).padStart(5,'0');
  return {
    index:userIndex,
    displayName:`Demo User ${number}`,
    upn:`demo.user${number}@example.invalid`
  };
}

function device(i:number,t:Template):Device{
  const isWindows=t.platform==='windows';
  const isAndroid=t.platform==='android';
  const isMac=t.platform==='macos';
  const isAppleMobile=t.platform==='ios'||t.platform==='ipados';
  const isLinux=t.platform==='linux';
  const compliant=i%9!==0&&i%17!==0;
  const grace=!compliant&&i%2===0;
  const encrypted=i%31!==0;
  const encryptionReported=i%53!==0;
  const securityCompromised=(isAppleMobile||isAndroid)&&(i%43===0||i%61===0);
  const noUser=i%13===0;
  const user=demoUser(i);
  const person=user.displayName;
  const userUpn=noUser?'':user.upn;
  const age=i%19===0?112:i%11===0?68:i%7===0?36:i%5===0?14:i%3===0?6:2;
  const enrollmentAge=enrollmentAgeDays(i);
  const version=t.versions[i%t.versions.length];
  const name=`DEMO-${t.platform.toUpperCase()}-${String(i+1).padStart(5,'0')}`;
  const deviceId=fakeGuid(i,11);
  const aadDeviceId=fakeGuid(i,23);
  const userId=noUser?'':fakeGuid(user.index,41);
  const serial=`DM${String(100000+i)}`;
  const architecture=isWindows?(i%12===0?'ARM64':'X64'):isMac?(t.architecture||'ARM64'):isLinux?'X64':'Unknown';
  const join=isWindows?(i%16===0?'Hybrid Azure AD joined':'Azure AD joined'):(isMac||isLinux||isAppleMobile||isAndroid?'Azure AD registered':'Unknown');
  const ownership=isWindows?(i%10===0?'Personal':'Corporate'):(i%37===0?'Personal':'Corporate');
  const managementAuthority=isWindows&&i%4===0?'Co-managed':'Intune';
  const cellular=(isAppleMobile||isAndroid)&&i%4!==0;
  const totalStorage=isWindows?(i%5===0?'976562':'487119'):isMac?'485869':isAppleMobile?(i%3===0?'262144':'131072'):'';
  const storageFreeRatio=i%11===0 ? 0.06 : i%7===0 ? 0.15 : i%3===0 ? 0.34 : 0.58;
  const freeStorage=(isWindows||isAppleMobile)&&totalStorage?String(Math.round(Number(totalStorage)*storageFreeRatio)):'';
  const certificateExpiry=(isWindows||isMac||isAppleMobile||i%10===0)?futureIntuneDate(40+(i%250)):'';
  const managementName=`${deviceId}_${isAppleMobile?'IPhone':isAndroid?'Android':isWindows?'Windows':t.os}_${new Date(now-(120+i%500)*86400000).toLocaleDateString('en-US')}`;
  const modelMatch=resolveDeviceModel({manufacturer:t.manufacturer,model:t.model,productName:t.productName??null,platform:t.platform});
  const displayModel=modelMatch.displayModel||t.model;
  const raw:Record<string,string>={
    'Device ID':deviceId,
    'Device name':name,
    'Enrollment date':enrollmentAge===null?'':intuneDateDaysAgo(enrollmentAge),
    'Last check-in':intuneDateDaysAgo(age),
    'Azure AD Device ID':aadDeviceId,
    'OS version':version,
    'Azure AD registered':String(!isWindows||join==='Hybrid Azure AD joined'),
    'EAS activation ID':i%6===0?'':compactHex(i+7,32),
    'Serial number':serial,
    'Manufacturer':rawManufacturer(t.manufacturer),
    'Model':t.model,
    'EAS activated':String(i%3!==0),
    'IMEI':cellular?`35${String(2000000000000+i*7919).slice(-13)}`:'',
    'Last EAS sync time':'0001-01-01 00:00:00.0000000',
    'EAS reason':'',
    'EAS status':'',
    'Compliance grace period expiration':grace?futureIntuneDate(3+(i%10)):'9999-12-31 23:59:59.9999999',
    'Security patch level':isAndroid?(i%5===0?'2026-05-01':i%3===0?'2026-08-01':'2026-08-05'):'',
    'Wi-Fi MAC':compactHex(i+17,12),
    'MEID':cellular&&i%17===0?String(35000000000000+i*37):'',
    'Subscriber carrier':cellular?(i%5===0?'KPN NL':'Odido NL'):'',
    'Total storage':totalStorage,
    'Free storage':freeStorage,
    'Management name':managementName,
    'Category':'',
    'UserId':userId,
    'Primary user UPN':userUpn,
    'Primary user email address':userUpn,
    'Primary user display name':noUser?'':person,
    'WiFiIPv4Address':`192.168.${2+(i%8)}.${4+(i%180)}`,
    'WiFiSubnetID':i%3===0?'192.168.178.0':i%3===1?'192.168.2.0':'10.18.8.0',
    'Compliance':compliant?'Compliant':grace?'InGracePeriod':'Noncompliant',
    'Managed by':managementAuthority,
    'Ownership':ownership,
    'Device state':i===44?'WipePending':'Managed',
    'Intune registered':i===57?'ApprovalPending':'Registered',
    'Supervised':String(isAppleMobile ? i%5!==0 : false),
    'Encrypted':encryptionReported?String(encrypted):'',
    'OS':t.os,
    'SkuFamily':isWindows?(i%8===0?'Pro':'Enterprise'):'',
    'JoinType':join,
    'Phone number':cellular?`+316${String(10000000+(i*7919)%89999999).padStart(8,'0')}`:'',
    'Jailbroken':(isAppleMobile||isAndroid)?String(securityCompromised):'Unknown',
    'ICCID':cellular?`8931 1632 ${String(10000000000+i*3571).slice(-11).replace(/(.{4})(.{4})(.*)/,'$1 $2 $3')}`:'',
    'EthernetMAC':isWindows||isMac||isLinux?compactHex(i+31,12):'',
    'CellularTechnology':cellular?'GSM':isAppleMobile||isAndroid?'None':'',
    'ProcessorArchitecture':architecture,
    'EID':cellular?`89043052010008887025${String(1000000000+i*7919).slice(-10)}`:'',
    'SystemManagementBIOSVersion':isWindows?(i%15===0?'':`1.${8+i%10}.0`):'',
    'TPMManufacturerId':isWindows?(i%15===0?'':i%7===0?'INTC':'NTC'):'',
    'TPMManufacturerVersion':isWindows?(i%15===0?'':i%7===0?'600.7.0.0':'7.2.3.1'):'',
    'ProductName':isAppleMobile?(t.productName||'iPhone14,6'):isAndroid&&i%12===0?'SM-A566B':'',
    'Management certificate expiration date':certificateExpiry,
  };
  return {
    id:deviceId,
    sourceFileName:'Demo inventory',
    deviceName:name,
    serialNumber:serial,
    platform:t.platform,
    sourceOS:t.os,
    osVersion:describeOsVersion(t.platform,version),
    manufacturer:t.manufacturer,
    model:displayModel,
    userDisplayName:noUser?null:person,
    userUpn:noUser?null:userUpn,
    compliance:raw['Compliance'],
    ownership:raw['Ownership'],
    managedBy:managementAuthority,
    lastCheckIn:isoDaysAgo(age),
    raw
  };
}

export function createDemoInventory():ImportResult{
  const devices:Device[]=[];
  for(let i=0;i<total;i++)devices.push(device(i,allocated[i%allocated.length]));

  // Small, deterministic data-quality imperfections keep the large demo realistic
  // without turning the dashboard into an error showcase.
  for(let index=2;index<devices.length;index+=503){devices[index].serialNumber=null;devices[index].raw['Serial number']=''}
  for(let index=211;index<devices.length;index+=997){
    devices[index].serialNumber=devices[index-1].serialNumber;
    devices[index].raw['Serial number']=devices[index-1].raw['Serial number'];
  }
  for(let index=337;index<devices.length;index+=1201){
    devices[index].deviceName=devices[index-1].deviceName;
    devices[index].raw['Device name']=devices[index-1].raw['Device name'];
  }
  for(let index=89;index<devices.length;index+=787){devices[index].model=null;devices[index].raw['Model']=''}
  for(let index=133;index<devices.length;index+=911){devices[index].manufacturer=null;devices[index].raw['Manufacturer']=''}
  for(let index=177;index<devices.length;index+=673){devices[index].lastCheckIn=null;devices[index].raw['Last check-in']=''}

  const columns=[...demoSourceColumns];
  return {sourceFileName:'Intune-Analyzer-Demo.csv',sourceFileNames:['Intune-Analyzer-Demo.csv'],csvFileName:'Intune-Analyzer-Demo.csv',csvFileNames:['Intune-Analyzer-Demo.csv'],devices,columns,duplicateCount:0};
}
