import type { Device, ImportResult, PlatformFamily } from './types';

type Template={platform:PlatformFamily;manufacturer:string;model:string;os:string;versions:string[];weight:number};
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
  {platform:'windows',manufacturer:'Microsoft',model:'Surface Laptop 5',os:'Windows',versions:['10.0.26200.9106','10.0.26100.9106'],weight:3},

  {platform:'macos',manufacturer:'Apple',model:'MacBook Air 13-inch (M3)',os:'macOS',versions:['26.6.1','26.6'],weight:5},
  {platform:'macos',manufacturer:'Apple',model:'MacBook Air 15-inch (M4)',os:'macOS',versions:['26.6.1','26.5'],weight:4},
  {platform:'macos',manufacturer:'Apple',model:'MacBook Pro 14-inch (M4)',os:'macOS',versions:['26.6.1','26.5'],weight:3},

  {platform:'ios',manufacturer:'Apple',model:'iPhone 16e',os:'iOS/iPadOS',versions:['26.6.1','26.6'],weight:8},
  {platform:'ios',manufacturer:'Apple',model:'iPhone 16',os:'iOS/iPadOS',versions:['26.6.1','26.6'],weight:6},
  {platform:'ios',manufacturer:'Apple',model:'iPhone SE (3rd generation)',os:'iOS/iPadOS',versions:['26.6.1','26.5.2'],weight:4},
  {platform:'ipados',manufacturer:'Apple',model:'iPad Pro 11-inch (M4)',os:'iOS/iPadOS',versions:['26.6.1','26.6'],weight:6},
  {platform:'ipados',manufacturer:'Apple',model:'iPad Air 11-inch (M3)',os:'iOS/iPadOS',versions:['26.6.1','26.6'],weight:5},
  {platform:'ipados',manufacturer:'Apple',model:'iPad (10th generation)',os:'iOS/iPadOS',versions:['26.6.1','26.5.2'],weight:4},

  {platform:'android',manufacturer:'Samsung',model:'Galaxy A56 5G',os:'Android (Corporate-Owned Work Profile)',versions:['16','15'],weight:8},
  {platform:'android',manufacturer:'Samsung',model:'Galaxy S25',os:'Android (Corporate-Owned Work Profile)',versions:['16','15'],weight:5},
  {platform:'android',manufacturer:'Samsung',model:'Galaxy XCover7',os:'Android (Fully Managed)',versions:['16','15'],weight:4},
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

const total=180;
const now=Date.now();
const people=[
  'Michael Scott','Dwight Schrute','Jim Halpert','Pam Beesly','Ryan Howard','Andy Bernard','Robert California',
  'Stanley Hudson','Kevin Malone','Angela Martin','Oscar Martinez','Phyllis Vance','Creed Bratton','Meredith Palmer',
  'Kelly Kapoor','Toby Flenderson','Darryl Philbin','Erin Hannon','Gabe Lewis','Holly Flax','Jan Levinson',
  'David Wallace','Roy Anderson','Karen Filippelli','Nellie Bertram','Clark Green','Pete Miller','Todd Packer',
  'Jo Bennett','Charles Miner','Deangelo Vickers','Mose Schrute','Bob Vance','Carol Stills','Val Johnson',
  'Senator Lipton','Cathy Simms','Helene Beesly','Isabel Poreba','Hank Tate'
];
const allocated:Template[]=[];
for(const t of templates)for(let i=0;i<t.weight;i++)allocated.push(t);

function isoDaysAgo(days:number){return new Date(now-days*86400000).toISOString()}
function device(i:number,t:Template):Device{
  const isWindows=t.platform==='windows';
  const isAndroid=t.platform==='android';
  const isMac=t.platform==='macos';
  const isAppleMobile=t.platform==='ios'||t.platform==='ipados';
  const isLinux=t.platform==='linux';
  const compliant=i%9!==0&&i%17!==0;
  const grace=!compliant&&i%2===0;
  const encrypted=i%31!==0;
  const noUser=i%13===0;
  const person=people[i%people.length];
  const age=i%19===0?112:i%11===0?68:i%7===0?36:i%5===0?14:i%3===0?6:2;
  const version=t.versions[i%t.versions.length];
  const name=`DEMO-${t.platform.toUpperCase()}-${String(i+1).padStart(3,'0')}`;
  const architecture=isWindows?(i%12===0?'ARM64':'X64'):isMac?'ARM64':isLinux?'X64':'Unknown';
  const join=isWindows?(i%16===0?'Hybrid Azure AD joined':'Azure AD joined'):(isMac||isLinux||isAppleMobile||isAndroid?'Azure AD registered':'Unknown');
  const certificateExpiry=new Date(now+(20+(i%220))*86400000).toISOString();
  const raw:Record<string,string>={
    'OS':t.os,
    'OS version':version,
    'Manufacturer':t.manufacturer,
    'Model':t.model,
    'Encrypted':String(encrypted),
    'Device state':i===44?'WipePending':'Managed',
    'Registration state':i===57?'ApprovalPending':'Registered',
    'Jailbroken':isAppleMobile?String(i===73):isAndroid?(i%14===0?'False':'Unknown'):'Unknown',
    'Supervised':String(isAppleMobile),
    'ProcessorArchitecture':architecture,
    'SkuFamily':isWindows?(i%8===0?'Pro':'Enterprise'):'',
    'JoinType':join,
    'Security patch level':isAndroid?(i%5===0?'2026-07-01':i%3===0?'2026-08-01':'2026-08-05'):'',
    'SystemManagementBIOSVersion':isWindows?(i%15===0?'':'1.'+(8+i%10)+'.0'):'',
    'TPMManufacturerId':isWindows?(i%15===0?'':'IFX'):'',
    'TPMManufacturerVersion':isWindows?(i%15===0?'':'7.63'):'',
    'ProductName':isAppleMobile?(t.platform==='ipados'?'iPad':'iPhone'):'',
    'Free storage':String(18+(i*7)%180),
    'Total storage':String(isWindows||isMac||isLinux?512:256),
    'Management certificate expiration date':(isWindows||isMac||isAppleMobile||i%10===0)?certificateExpiry:'',
  };
  return {id:`demo-${i+1}`,sourceFileName:'Demo inventory',deviceName:name,serialNumber:`DM${String(100000+i)}`,platform:t.platform,sourceOS:t.os,osVersion:version,manufacturer:t.manufacturer,model:t.model,userDisplayName:noUser?null:person,userUpn:noUser?null:`${person.toLowerCase().replace(/ /g,'.')}@dundermifflin.example`,compliance:compliant?'Compliant':grace?'InGracePeriod':'Noncompliant',ownership:i%37===0?'Personal':'Corporate',managedBy:'Intune',lastCheckIn:isoDaysAgo(age),raw};
}

export function createDemoInventory():ImportResult{
  const devices:Device[]=[];
  for(let i=0;i<total;i++)devices.push(device(i,allocated[i%allocated.length]));
  const columns=['Device ID','Device name','Enrollment date','Last check-in','OS version','Serial number','Manufacturer','Model','Security patch level','Primary user UPN','Primary user display name','Compliance','Managed by','Ownership','Device state','Supervised','Encrypted','OS','SkuFamily','JoinType','Jailbroken','ProcessorArchitecture','SystemManagementBIOSVersion','TPMManufacturerId','TPMManufacturerVersion','ProductName','Total storage','Free storage','Management certificate expiration date'];
  return {sourceFileName:'Intune-Analyzer-Demo.csv',sourceFileNames:['Intune-Analyzer-Demo.csv'],csvFileName:'Intune-Analyzer-Demo.csv',csvFileNames:['Intune-Analyzer-Demo.csv'],devices,columns,duplicateCount:0};
}
