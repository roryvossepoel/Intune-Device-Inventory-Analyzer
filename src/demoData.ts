import type { Device, ImportResult, PlatformFamily } from './types';

type Template={platform:PlatformFamily;manufacturer:string;model:string;os:string;versions:string[];weight:number};
const templates:Template[]=[
  {platform:'windows',manufacturer:'Dell',model:'Dell Pro 16 PC16250',os:'Windows',versions:['10.0.26200.9106','10.0.26200.8893'],weight:18},
  {platform:'windows',manufacturer:'Microsoft',model:'Surface Laptop 5',os:'Windows',versions:['10.0.26200.9106','10.0.26100.9106'],weight:11},
  {platform:'windows',manufacturer:'Lenovo',model:'ThinkPad T14 Gen 5',os:'Windows',versions:['10.0.26200.9106','10.0.26100.9106'],weight:9},
  {platform:'macos',manufacturer:'Apple',model:'MacBook Air (M3)',os:'macOS',versions:['26.6.1','26.6'],weight:6},
  {platform:'macos',manufacturer:'Apple',model:'MacBook Pro 14-inch (M4)',os:'macOS',versions:['26.6.1','26.5'],weight:4},
  {platform:'ipados',manufacturer:'Apple',model:'iPad Pro 11-inch (M4)',os:'iPadOS',versions:['26.6.1','26.6'],weight:14},
  {platform:'ipados',manufacturer:'Apple',model:'iPad (10th generation)',os:'iPadOS',versions:['26.6.1','26.5.2'],weight:8},
  {platform:'ios',manufacturer:'Apple',model:'iPhone 16e',os:'iOS',versions:['26.6.1','26.6'],weight:12},
  {platform:'android',manufacturer:'Samsung',model:'SM-A566B',os:'Android',versions:['16','15'],weight:13},
  {platform:'android',manufacturer:'Samsung',model:'SM-A556B',os:'Android',versions:['16','15'],weight:5},
];

const total=100;
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
for(const t of templates) for(let i=0;i<t.weight;i++) allocated.push(t);

function isoDaysAgo(days:number){return new Date(now-days*86400000).toISOString()}
function device(i:number,t:Template):Device{
  const isWindows=t.platform==='windows';
  const isAndroid=t.platform==='android';
  const isMac=t.platform==='macos';
  const compliant=i%9!==0 && i%17!==0;
  const grace=!compliant && i%2===0;
  const encrypted=i%31!==0;
  const noUser=i%13===0;
  const person=people[i%people.length];
  const age=i%19===0?112:i%11===0?68:i%7===0?36:i%5===0?14:i%3===0?6:2;
  const version=t.versions[i%t.versions.length];
  const name=`DEMO-${t.platform.toUpperCase()}-${String(i+1).padStart(3,'0')}`;
  const raw:Record<string,string>={
    'Encrypted':String(encrypted),
    'Device state':i===44?'WipePending':'Managed',
    'Registration state':i===57?'ApprovalPending':'Registered',
    'Jailbroken':String(i===73),
    'Architecture':isWindows?(i%12===0?'ARM64':'x64'):isMac?'arm64':'',
    'SkuFamily':isWindows?(i%8===0?'Professional':'Enterprise'):'',
    'Join type':isWindows?(i%16===0?'Microsoft Entra hybrid joined':'Microsoft Entra joined'):isMac?'Microsoft Entra registered':'',
    'Security patch level':isAndroid?(i%4===0?'2026-07-01':'2026-08-01'):'',
    'Free storage':String(18+(i*7)%180),
    'Total storage':String(isWindows?512:isMac?512:256),
    'Management certificate expiration date':new Date(now+(45+(i%250))*86400000).toISOString(),
  };
  return {id:`demo-${i+1}`,sourceFileName:'Demo inventory',deviceName:name,serialNumber:`DM${String(100000+i)}`,platform:t.platform,sourceOS:t.os,osVersion:version,manufacturer:t.manufacturer,model:t.model,userDisplayName:noUser?null:person,userUpn:noUser?null:`${person.toLowerCase().replace(/ /g,'.')}@dundermifflin.example`,compliance:compliant?'Compliant':grace?'InGracePeriod':'Noncompliant',ownership:i%37===0?'Personal':'Corporate',managedBy:'Intune',lastCheckIn:isoDaysAgo(age),raw};
}

export function createDemoInventory():ImportResult{
  const devices:Device[]=[];
  for(let i=0;i<total;i++) devices.push(device(i,allocated[i%allocated.length]));
  const columns=['Device name','Serial number','Operating system','OS version','Manufacturer','Model','Primary user','Compliance','Ownership','Last check-in','Encrypted','Device state','Registration state','Jailbroken','Architecture','SkuFamily','Join type','Security patch level','Free storage','Total storage','Management certificate expiration date'];
  return {sourceFileName:'Intune-Analyzer-Demo.csv',sourceFileNames:['Intune-Analyzer-Demo.csv'],csvFileName:'Intune-Analyzer-Demo.csv',csvFileNames:['Intune-Analyzer-Demo.csv'],devices,columns,duplicateCount:0};
}
