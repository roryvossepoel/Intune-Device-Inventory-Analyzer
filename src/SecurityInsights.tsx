import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Device } from './types';
const fmt=(n:number)=>n.toLocaleString();
function raw(d:Device,names:RegExp[]){for(const [k,v] of Object.entries(d.raw)){if(names.some(r=>r.test(k.trim()))&&v?.trim())return v.trim()}return ''}
function boolState(v:string){const s=v.trim().toLowerCase();if(['true','yes','1','encrypted'].includes(s))return true;if(['false','no','0','not encrypted','unencrypted'].includes(s))return false;return null}
function daysSince(value:string|null){if(!value)return null;const time=Date.parse(value);return Number.isFinite(time)?(Date.now()-time)/86400000:null}
function count(values:string[]){return Object.entries(values.reduce<Record<string,number>>((acc,value)=>{acc[value]=(acc[value]??0)+1;return acc},{})).sort((a,b)=>b[1]-a[1])}
function pct(value:number,total:number){return total?value/total*100:0}
function platformName(value:string){return value==='windows'?'Windows':value==='android'?'Android':value==='macos'?'macOS':value==='linux'?'Linux':value==='applemobile'?'iOS/iPadOS':'Unknown'}
function platformFamily(value:string){return value==='ios'||value==='ipados'?'applemobile':value}
function cleanManufacturer(value:string|null){const rawName=value?.trim()||'Unknown';const n=rawName.toLowerCase();if(n==='dell inc.'||n==='dell')return 'Dell';if(n==='microsoft corporation'||n==='microsoft')return 'Microsoft';if(n==='lenovo'||n==='lenovo group limited')return 'Lenovo';if(n==='samsung'||n==='samsung electronics')return 'Samsung';if(n==='apple'||n==='apple inc.')return 'Apple';if(n==='hp'||n==='hewlett-packard'||n==='hewlett packard')return 'HP';if(n==='google'||n==='google llc')return 'Google';return rawName}
export function encryptionState(d:Device){return boolState(raw(d,[/^encrypted$/i,/encryption status/i,/is encrypted/i]))}
export function securityAttention(devices:Device[]){let notEncrypted=0,unknownEncryption=0,wipePending=0,approvalPending=0,rooted=0;for(const d of devices){const encryption=encryptionState(d);if(encryption===false)notEncrypted++;else if(encryption===null)unknownEncryption++;const state=raw(d,[/^device state$/i,/management state/i]).toLowerCase();if(state.includes('wipepending')||state.includes('wipe pending'))wipePending++;const reg=raw(d,[/registration state/i]).toLowerCase();if(reg.includes('approvalpending')||reg.includes('approval pending'))approvalPending++;const jail=boolState(raw(d,[/jailbroken/i,/rooted/i,/jailbreak/i]));if(jail===true)rooted++}return{notEncrypted,unknownEncryption,wipePending,approvalPending,rooted}}

function HighlightText({text}:{text:string}){
  const highlight=/((?:\d{1,3}(?:[.,]\d{3})+|\d+(?:\.\d+)?)%?|Windows|Android|iOS\/iPadOS|macOS|Linux|Dell|Apple|Samsung|Microsoft|Lenovo|HP|Google)/g;
  return <>{text.split(highlight).map((part,index)=>highlight.test(part)?<strong className="summaryHighlight" key={index}>{part}</strong>:part)}</>;
}

export function InventorySummary({devices}:{devices:Device[]}){
  const [host,setHost]=useState<HTMLDivElement|null>(null);
  useEffect(()=>{
    const dashboard=document.querySelector('.inventoryDashboard');
    const kpis=dashboard?.querySelector('.healthKpis');
    if(!dashboard||!kpis)return;
    const node=document.createElement('div');
    node.className='inventorySummaryHost';
    kpis.insertAdjacentElement('afterend',node);
    setHost(node);
    return()=>{node.remove();setHost(null)};
  },[]);

  const total=devices.length;
  if(!total||!host)return null;
  const platformCounts=count(devices.map(d=>platformFamily(d.platform)));
  const topPlatform=platformCounts[0];
  const compliant=devices.filter(d=>d.compliance?.toLowerCase()==='compliant').length;
  const noncompliant=devices.filter(d=>d.compliance?.toLowerCase()==='noncompliant').length;
  const stale30=devices.filter(d=>{const age=daysSince(d.lastCheckIn);return age!==null&&age>30}).length;
  const stale90=devices.filter(d=>{const age=daysSince(d.lastCheckIn);return age!==null&&age>90}).length;
  let encrypted=0,knownEncryption=0;
  for(const d of devices){const state=encryptionState(d);if(state!==null){knownEncryption++;if(state)encrypted++}}
  const manufacturers=count(devices.map(d=>cleanManufacturer(d.manufacturer)).filter(v=>v!=='Unknown'));
  const topManufacturers=manufacturers.slice(0,4).map(([name])=>name);
  const uniqueModels=new Set(devices.map(d=>d.model?.trim()).filter(Boolean)).size;
  const namedUsers=new Set(devices.map(d=>d.userUpn||d.userDisplayName).filter(Boolean)).size;

  const introParts:string[]=[];
  if(topPlatform){const share=pct(topPlatform[1],total);introParts.push(`${platformName(topPlatform[0])} is the largest platform with ${fmt(topPlatform[1])} devices (${share.toFixed(1)}%)`)}
  if(platformCounts.length>1){const rest=platformCounts.slice(1,4).map(([name,n])=>`${platformName(name)} ${pct(n,total).toFixed(1)}%`);if(rest.length)introParts.push(`followed by ${rest.join(', ')}`)}
  const paragraph1=`The current inventory contains ${fmt(total)} managed device${total===1?'':'s'}${namedUsers?` across ${fmt(namedUsers)} identified user${namedUsers===1?'':'s'}`:''}. ${introParts.length?introParts.join(', ')+'.':''}`;

  const healthParts:string[]=[];
  const compliancePct=pct(compliant,total);
  if(compliancePct>=90)healthParts.push(`Overall compliance is strong at ${compliancePct.toFixed(1)}%`);
  else if(compliancePct>=75)healthParts.push(`Overall compliance is ${compliancePct.toFixed(1)}%, with ${fmt(noncompliant)} noncompliant device${noncompliant===1?'':'s'} requiring attention`);
  else healthParts.push(`Compliance requires attention: ${compliancePct.toFixed(1)}% of devices are compliant and ${fmt(noncompliant)} are noncompliant`);
  if(stale30>0){const staleShare=pct(stale30,total);healthParts.push(`${fmt(stale30)} device${stale30===1?' has':'s have'} not checked in for more than 30 days${stale90?`, including ${fmt(stale90)} inactive for over 90 days`:''} (${staleShare.toFixed(1)}% of inventory)`)}
  if(knownEncryption){const encPct=pct(encrypted,knownEncryption);if(encPct>=98)healthParts.push(`reported encryption coverage is very strong at ${encPct.toFixed(1)}%`);else if(encPct>=90)healthParts.push(`reported encryption coverage is ${encPct.toFixed(1)}%`);else healthParts.push(`reported encryption coverage is ${encPct.toFixed(1)}%, which warrants review`)}
  const paragraph2=healthParts.join('. ')+'.';

  const estateParts:string[]=[];
  if(topManufacturers.length)estateParts.push(`Hardware is spread across several major vendors, with ${topManufacturers.join(', ')} accounting for most of the current view`);
  if(uniqueModels){const diversity=uniqueModels/total;if(diversity<0.03)estateParts.push(`across a highly standardized mix of ${fmt(uniqueModels)} reported models`);else if(diversity<0.08)estateParts.push(`across ${fmt(uniqueModels)} reported models`);else estateParts.push(`across a relatively diverse mix of ${fmt(uniqueModels)} reported models`)}
  const paragraph3=estateParts.length?estateParts.join(' ')+'.':'';

  return createPortal(<article className="inventorySummaryCard">
    <div className="inventorySummaryCopy"><p><HighlightText text={paragraph1}/></p><p><HighlightText text={paragraph2}/></p>{paragraph3&&<p><HighlightText text={paragraph3}/></p>}</div>
  </article>,host);
}

export default function EncryptionCard({devices,onNotEncrypted,onUnknown}:{devices:Device[];onNotEncrypted?:()=>void;onUnknown?:()=>void}){let encrypted=0,notEncrypted=0,unknown=0;for(const d of devices){const s=encryptionState(d);if(s===true)encrypted++;else if(s===false)notEncrypted++;else unknown++}const total=devices.length,p=total?encrypted/total*100:0;const parts=[['Encrypted',encrypted,'good'],['Not encrypted',notEncrypted,'bad'],['Unknown',unknown,'neutral']] as const;let cursor=0;const colors={good:'#18a873',bad:'#e45d61',neutral:'#9aa9ba'};const stops=parts.filter(([,n])=>n>0).map(([,n,t])=>{const start=cursor;cursor+=total?n/total*100:0;return `${colors[t]} ${start}% ${cursor}%`});return <><InventorySummary devices={devices}/><article className="dashboardCard encryptionCard"><header className="dashboardCardHead securityCardHead"><span className="securityCardIcon"><LockIcon/></span><div><h2>Encryption status</h2><p>Reported device encryption state</p></div></header><div className="encryptionBody"><div className="securityDonut" style={{background:`conic-gradient(${stops.join(',')||'#e7eef7 0 100%'})`}}><div><strong>{p.toFixed(1)}%</strong><span>encrypted</span></div></div><div className="securityLegend">{parts.filter(([,n])=>n>0).map(([label,n,t])=>{const action=label==='Not encrypted'?onNotEncrypted:label==='Unknown'?onUnknown:undefined;return <button key={label} className={t} disabled={!action} onClick={action}><i/><span>{label}</span><strong>{fmt(n)}</strong><small>{total?(n/total*100).toFixed(1):'0'}%</small></button>})}</div></div></article></>}
function LockIcon(){return <svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v2"/></svg>}
