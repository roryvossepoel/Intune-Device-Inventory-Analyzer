import { useEffect, useMemo, useRef, useState } from 'react';
import { getWindowsIntelligence } from './deviceIntelligence';
import { appleDeviceFamily, cellularCapability, hardwareType } from './hardwareClassification';
import type { Device } from './types';

export type HardwareExplorerFilterState={
  deviceTypes:string[];
  appleFamilies:string[];
  cellularCapabilities:string[];
  windowsReleases:string[];
  windowsEditions:string[];
  windowsArchitectures:string[];
  windowsOwnerships:string[];
  windowsJoinTypes:string[];
  windowsManagedBy:string[];
};

export const emptyHardwareExplorerFilters=():HardwareExplorerFilterState=>({
  deviceTypes:[],appleFamilies:[],cellularCapabilities:[],windowsReleases:[],windowsEditions:[],windowsArchitectures:[],windowsOwnerships:[],windowsJoinTypes:[],windowsManagedBy:[]
});

const unique=(values:string[])=>[...new Set(values.filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'}));
const rawValue=(device:Device,patterns:RegExp[])=>{for(const [name,value] of Object.entries(device.raw)){if(patterns.some(pattern=>pattern.test(name))&&value?.trim())return value.trim()}return ''};
const isAppleMobile=(device:Device)=>device.platform==='ios'||device.platform==='ipados';
const isMobile=(device:Device)=>isAppleMobile(device)||device.platform==='android';
const isWindows=(device:Device)=>device.platform==='windows';
const windowsRelease=(device:Device)=>getWindowsIntelligence(device.osVersion)?.releaseName||'Unknown';
const windowsEdition=(device:Device)=>rawValue(device,[/^SkuFamily$/i,/^OS SKU$/i,/^SKU$/i])||'Unknown';
const windowsArchitecture=(device:Device)=>rawValue(device,[/^ProcessorArchitecture$/i,/^Architecture$/i])||'Unknown';
const windowsOwnership=(device:Device)=>device.ownership?.trim()||'Unknown';
const windowsJoinType=(device:Device)=>rawValue(device,[/^JoinType$/i,/^Join type$/i])||'Unknown';
const windowsManagedBy=(device:Device)=>device.managedBy?.trim()||'Unknown';

export function hardwareExplorerFilterMatches(device:Device,filters:HardwareExplorerFilterState){
  if(filters.deviceTypes.length&&!filters.deviceTypes.includes(hardwareType(device)))return false;
  if(filters.appleFamilies.length&&(!isAppleMobile(device)||!filters.appleFamilies.includes(appleDeviceFamily(device))))return false;
  if(filters.cellularCapabilities.length&&(!isMobile(device)||!filters.cellularCapabilities.includes(cellularCapability(device))))return false;
  if(filters.windowsReleases.length&&(!isWindows(device)||!filters.windowsReleases.includes(windowsRelease(device))))return false;
  if(filters.windowsEditions.length&&(!isWindows(device)||!filters.windowsEditions.includes(windowsEdition(device))))return false;
  if(filters.windowsArchitectures.length&&(!isWindows(device)||!filters.windowsArchitectures.includes(windowsArchitecture(device))))return false;
  if(filters.windowsOwnerships.length&&(!isWindows(device)||!filters.windowsOwnerships.includes(windowsOwnership(device))))return false;
  if(filters.windowsJoinTypes.length&&(!isWindows(device)||!filters.windowsJoinTypes.includes(windowsJoinType(device))))return false;
  if(filters.windowsManagedBy.length&&(!isWindows(device)||!filters.windowsManagedBy.includes(windowsManagedBy(device))))return false;
  return true;
}

function Chevron({open}:{open:boolean}){return <svg className="multiFilterChevron" aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={open?'m4.5 9.5 3.5-3 3.5 3':'m4.5 6.5 3.5 3 3.5-3'}/></svg>}

function MultiSelect({label,values,selected,onChange,allLabel}:{label:string;values:string[];selected:string[];onChange:(values:string[])=>void;allLabel:string}){
  const [open,setOpen]=useState(false);
  const root=useRef<HTMLDivElement>(null);
  const summary=selected.length===0?allLabel:selected.length===1?selected[0]:`${selected.length} selected`;
  function toggle(value:string){onChange(selected.includes(value)?selected.filter(item=>item!==value):[...selected,value])}
  useEffect(()=>{
    if(!open)return;
    const outside=(event:PointerEvent)=>{if(root.current&&!root.current.contains(event.target as Node))setOpen(false)};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)};
    document.addEventListener('pointerdown',outside);
    document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)};
  },[open]);
  return <div className="multiFilter hardwareFixedMultiFilter" ref={root}>
    <span>{label}</span>
    <div className="multiFilterControl">
      <button type="button" className={`multiFilterTrigger ${open?'open':''} ${selected.length?'hasValue':''}`} aria-expanded={open} onClick={()=>setOpen(value=>!value)}><span>{summary}</span><Chevron open={open}/></button>
      {selected.length>0&&<button type="button" className="multiFilterClear" aria-label={`Clear ${label} filter`} title={`Clear ${label} filter`} onClick={()=>{onChange([]);setOpen(false)}}><svg aria-hidden="true" viewBox="0 0 16 16"><path d="m5 5 6 6M11 5l-6 6"/></svg></button>}
      {open&&<div className="multiFilterMenu"><button type="button" onClick={()=>{onChange([]);setOpen(false)}} className={selected.length===0?'selected':''}>{allLabel}</button>{values.map(value=><label key={value}><input type="checkbox" checked={selected.includes(value)} onChange={()=>toggle(value)}/><span>{value}</span></label>)}</div>}
    </div>
  </div>;
}

export default function HardwareExplorerFilters({devices,value,onChange}:{devices:Device[];value:HardwareExplorerFilterState;onChange:(value:HardwareExplorerFilterState)=>void}){
  const deviceTypes=useMemo(()=>unique(devices.map(hardwareType)),[devices]);
  const appleFamilies=useMemo(()=>unique(devices.filter(isAppleMobile).map(appleDeviceFamily).filter(value=>value!=='Unknown')),[devices]);
  const cellularCapabilities=useMemo(()=>unique(devices.filter(isMobile).map(cellularCapability)),[devices]);
  const windowsDevices=useMemo(()=>devices.filter(isWindows),[devices]);
  const windowsReleases=useMemo(()=>unique(windowsDevices.map(windowsRelease)),[windowsDevices]);
  const windowsEditions=useMemo(()=>unique(windowsDevices.map(windowsEdition)),[windowsDevices]);
  const windowsArchitectures=useMemo(()=>unique(windowsDevices.map(windowsArchitecture)),[windowsDevices]);
  const windowsOwnerships=useMemo(()=>unique(windowsDevices.map(windowsOwnership)),[windowsDevices]);
  const windowsJoinTypes=useMemo(()=>unique(windowsDevices.map(windowsJoinType)),[windowsDevices]);
  const windowsManagedByValues=useMemo(()=>unique(windowsDevices.map(windowsManagedBy)),[windowsDevices]);
  return <section className="hardwareFixedFilters" aria-label="Inventory drill-through filters">
    <div className="deviceFilterPanel hardwareFixedFilterPanel">
      <MultiSelect label="Device type" values={deviceTypes} selected={value.deviceTypes} onChange={deviceTypes=>onChange({...value,deviceTypes})} allLabel="All device types"/>
      {appleFamilies.length>0&&<MultiSelect label="Apple device family" values={appleFamilies} selected={value.appleFamilies} onChange={appleFamilies=>onChange({...value,appleFamilies})} allLabel="All Apple families"/>}
      {cellularCapabilities.length>0&&<MultiSelect label="Cellular capability" values={cellularCapabilities} selected={value.cellularCapabilities} onChange={cellularCapabilities=>onChange({...value,cellularCapabilities})} allLabel="All mobile devices"/>}
      {windowsReleases.length>0&&<MultiSelect label="Windows release" values={windowsReleases} selected={value.windowsReleases} onChange={windowsReleases=>onChange({...value,windowsReleases})} allLabel="All releases"/>}
      {windowsEditions.length>0&&<MultiSelect label="Windows edition" values={windowsEditions} selected={value.windowsEditions} onChange={windowsEditions=>onChange({...value,windowsEditions})} allLabel="All editions"/>}
      {windowsArchitectures.length>0&&<MultiSelect label="Windows architecture" values={windowsArchitectures} selected={value.windowsArchitectures} onChange={windowsArchitectures=>onChange({...value,windowsArchitectures})} allLabel="All architectures"/>}
      {windowsOwnerships.length>0&&<MultiSelect label="Windows ownership" values={windowsOwnerships} selected={value.windowsOwnerships} onChange={windowsOwnerships=>onChange({...value,windowsOwnerships})} allLabel="All ownership"/>}
      {windowsJoinTypes.length>0&&<MultiSelect label="Windows join type" values={windowsJoinTypes} selected={value.windowsJoinTypes} onChange={windowsJoinTypes=>onChange({...value,windowsJoinTypes})} allLabel="All join types"/>}
      {windowsManagedByValues.length>0&&<MultiSelect label="Windows managed by" values={windowsManagedByValues} selected={value.windowsManagedBy} onChange={windowsManagedBy=>onChange({...value,windowsManagedBy})} allLabel="All management agents"/>}
    </div>
  </section>;
}