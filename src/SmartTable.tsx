import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

type SortDirection = 'asc' | 'desc';

export type SmartColumn<T> = {
  key: string;
  label: string;
  value: (row:T)=>string|number|null|undefined;
  render?: (row:T)=>ReactNode;
  numeric?: boolean;
};

export type DeviceTableInitialFilters = {
  platform?: string;
  manufacturer?: string;
  model?: string;
  osVersion?: string;
  compliance?: string;
  encryption?: string;
};

type Props<T> = {
  rows: T[];
  columns: SmartColumn<T>[];
  rowKey: (row:T)=>string;
  exportName: string;
  onRowClick?: (row:T)=>void;
  initialPageSize?: number;
  initialFilters?: DeviceTableInitialFilters;
  onClearFilters?: ()=>void;
  searchQuery?: string;
  onClearSearch?: ()=>void;
};

type DeviceLike={
  id?:string;
  deviceName?:string|null;
  serialNumber?:string|null;
  platform?:string;
  osVersion?:string|null;
  compliance?:string|null;
  manufacturer?:string|null;
  model?:string|null;
  ownership?:string|null;
  managedBy?:string|null;
  userUpn?:string|null;
  userDisplayName?:string|null;
  lastCheckIn?:string|null;
  raw?:Record<string,string>;
};

type ExplorerColumn<T>=SmartColumn<T>&{rawField?:boolean;pickerLabel?:string;exportLabel?:string};
type PlatformFilterDefinition={label:string;allLabel:string;value:(device:DeviceLike)=>string};

const pageSizes=[25,50,100,250];
const normalize=(value:string|number|null|undefined)=>value==null?'':value;
const csvCell=(value:unknown)=>`"${String(value??'').replace(/"/g,'""')}"`;
const unique=(values:(string|null|undefined)[])=>[...new Set(values.map(v=>v?.trim()).filter(Boolean) as string[])].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:'base'}));
const rawValue=(row:DeviceLike,pattern:RegExp)=>Object.entries(row.raw||{}).find(([name])=>pattern.test(name))?.[1]?.trim()||'';
const encryption=(row:DeviceLike)=>{const v=rawValue(row,/^encrypted$|encryption status|is encrypted/i).toLowerCase();return ['true','yes','1','encrypted'].includes(v)?'Encrypted':['false','no','0','not encrypted','unencrypted'].includes(v)?'Not encrypted':'Unknown'};
const ageDays=(value?:string|null)=>{if(!value)return null;const t=Date.parse(value);return Number.isFinite(t)?Math.max(0,(Date.now()-t)/86400000):null};
const platformFamily=(value?:string)=>value==='ios'||value==='ipados'?'applemobile':value||'unknown';
const platformName=(value:string)=>value==='windows'?'Windows':value==='android'?'Android':value==='applemobile'?'Apple Mobile':value==='macos'?'macOS':value==='linux'?'Linux':value==='unknown'?'Unknown':value;
const deviceOf=<T,>(row:T)=>row as unknown as DeviceLike;
const sku=(row:DeviceLike)=>rawValue(row,/^SkuFamily$|^OS SKU$|^SKU$/i)||'Unknown';
const securityPatch=(row:DeviceLike)=>rawValue(row,/^Security patch level$/i)||'Unknown';
const architecture=(row:DeviceLike)=>rawValue(row,/^ProcessorArchitecture$|^Architecture$/i)||'Unknown';
const supervision=(row:DeviceLike)=>{const value=rawValue(row,/^Supervised$/i);return /^true$/i.test(value)?'Supervised':/^false$/i.test(value)?'Not supervised':'Unknown'};

function SortIcon({active,direction}:{active:boolean;direction:SortDirection}){
  if(active)return <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{direction==='asc'?<path d="m4.75 9.25 3.25-3.25 3.25 3.25"/>:<path d="m4.75 6.75 3.25 3.25 3.25-3.25"/>}</svg>;
  return <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round"><path d="m5.25 6.5 2.75-2.75 2.75 2.75"/><path d="m5.25 9.5 2.75 2.75 2.75-2.75"/></svg>;
}

function DragIcon(){
  return <svg aria-hidden="true" viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><circle cx="5" cy="4" r="1"/><circle cx="11" cy="4" r="1"/><circle cx="5" cy="8" r="1"/><circle cx="11" cy="8" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="11" cy="12" r="1"/></svg>;
}

function DropdownChevron({open}:{open:boolean}){
  return <svg className="multiFilterChevron" aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={open?'m4.5 9.5 3.5-3 3.5 3':'m4.5 6.5 3.5 3 3.5-3'}/></svg>;
}

function MultiSelect({label,values,selected,onChange,allLabel='All',className=''}:{label:string;values:string[];selected:string[];onChange:(values:string[])=>void;allLabel?:string;className?:string}){
  const [open,setOpen]=useState(false);
  const root=useRef<HTMLDivElement>(null);
  const summary=selected.length===0?allLabel:selected.length===1?selected[0]:`${selected.length} selected`;
  function toggle(value:string){onChange(selected.includes(value)?selected.filter(v=>v!==value):[...selected,value])}
  useEffect(()=>{
    if(!open)return;
    const outside=(event:PointerEvent)=>{if(root.current&&!root.current.contains(event.target as Node))setOpen(false)};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)};
    document.addEventListener('pointerdown',outside);
    document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)};
  },[open]);
  return <div className={`multiFilter ${className}`} ref={root}>
    <span>{label}</span>
    <div className="multiFilterControl">
      <button type="button" className={`multiFilterTrigger ${open?'open':''} ${selected.length?'hasValue':''}`} aria-expanded={open} onClick={()=>setOpen(v=>!v)}><span>{summary}</span><DropdownChevron open={open}/></button>
      {selected.length>0&&<button type="button" className="multiFilterClear" aria-label={`Clear ${label} filter`} title={`Clear ${label} filter`} onClick={()=>{onChange([]);setOpen(false)}}><svg aria-hidden="true" viewBox="0 0 16 16"><path d="m5 5 6 6M11 5l-6 6"/></svg></button>}
      {open&&<div className="multiFilterMenu"><button type="button" onClick={()=>{onChange([]);setOpen(false)}} className={selected.length===0?'selected':''}>{allLabel}</button>{values.map(value=><label key={value}><input type="checkbox" checked={selected.includes(value)} onChange={()=>toggle(value)}/><span>{value}</span></label>)}</div>}
    </div>
  </div>;
}

function complianceTone(value:string){
  const normalized=value.toLowerCase().replace(/[\s_-]/g,'');
  if(normalized==='compliant')return 'good';
  if(normalized==='noncompliant')return 'bad';
  if(normalized.includes('grace'))return 'warn';
  return 'neutral';
}

function displayCell<T>(column:ExplorerColumn<T>,row:T){
  if(column.render)return column.render(row);
  const value=column.value(row);
  const text=value==null||String(value).trim()===''?'—':String(value);
  if(column.key==='compliance'&&text!=='—')return <span className={`complianceBadge ${complianceTone(text)}`}>{text}</span>;
  return text;
}

function platformFilterFor(platform:string|null):PlatformFilterDefinition|null{
  if(platform==='Windows')return{label:'Windows SKU',allLabel:'All editions',value:sku};
  if(platform==='Android')return{label:'Security patch level',allLabel:'All patch levels',value:securityPatch};
  if(platform==='Apple Mobile')return{label:'Supervision',allLabel:'All supervision states',value:supervision};
  if(platform==='macOS'||platform==='Linux')return{label:'Architecture',allLabel:'All architectures',value:architecture};
  return null;
}

export default function SmartTable<T>({rows,columns,rowKey,exportName,onRowClick,initialPageSize=50,initialFilters,onClearFilters,searchQuery='',onClearSearch}:Props<T>){
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(initialPageSize);
  const [sortKey,setSortKey]=useState(columns[0]?.key??'');
  const [sortDirection,setSortDirection]=useState<SortDirection>('asc');
  const isDevices=exportName==='intune-devices';
  const [platformsSelected,setPlatformsSelected]=useState<string[]>([]);
  const [manufacturersSelected,setManufacturersSelected]=useState<string[]>([]);
  const [modelsSelected,setModelsSelected]=useState<string[]>([]);
  const [osVersionsSelected,setOsVersionsSelected]=useState<string[]>([]);
  const [compliancesSelected,setCompliancesSelected]=useState<string[]>([]);
  const [encryptionsSelected,setEncryptionsSelected]=useState<string[]>([]);
  const [ownershipsSelected,setOwnershipsSelected]=useState<string[]>([]);
  const [userStatesSelected,setUserStatesSelected]=useState<string[]>([]);
  const [platformSpecificSelected,setPlatformSpecificSelected]=useState<string[]>([]);
  const [maxAge,setMaxAge]=useState(180);
  const [columnsOpen,setColumnsOpen]=useState(false);
  const [visibleKeys,setVisibleKeys]=useState<string[]>(()=>columns.map(c=>c.key));
  const [columnOrder,setColumnOrder]=useState<string[]>(()=>columns.map(c=>c.key));
  const [draggedColumn,setDraggedColumn]=useState<string|null>(null);
  const [dropColumn,setDropColumn]=useState<string|null>(null);

  useEffect(()=>{
    if(!isDevices)return;
    setPlatformsSelected(initialFilters?.platform?[initialFilters.platform]:[]);
    setManufacturersSelected(initialFilters?.manufacturer?[initialFilters.manufacturer]:[]);
    setModelsSelected(initialFilters?.model?[initialFilters.model]:[]);
    setOsVersionsSelected(initialFilters?.osVersion?[initialFilters.osVersion]:[]);
    setCompliancesSelected(initialFilters?.compliance?[initialFilters.compliance]:[]);
    setEncryptionsSelected(initialFilters?.encryption?[initialFilters.encryption]:[]);
    setOwnershipsSelected([]);
    setUserStatesSelected([]);
    setPlatformSpecificSelected([]);
    setMaxAge(180);
    setPage(1);
  },[isDevices,initialFilters]);

  const devices=rows as unknown as DeviceLike[];
  const platformValues=useMemo(()=>unique(devices.map(d=>platformName(platformFamily(d.platform)))),[rows]);
  const manufacturers=useMemo(()=>unique(devices.map(d=>d.manufacturer)),[rows]);
  const models=useMemo(()=>unique(devices.filter(d=>!manufacturersSelected.length||manufacturersSelected.includes(d.manufacturer||'')).map(d=>d.model)),[rows,manufacturersSelected]);
  const osVersions=useMemo(()=>unique(devices.map(d=>d.osVersion)),[rows]);
  const compliances=useMemo(()=>unique(devices.map(d=>d.compliance)),[rows]);
  const ownerships=useMemo(()=>unique(devices.map(d=>d.ownership)),[rows]);
  const encryptionValues=['Encrypted','Not encrypted','Unknown'];
  const userStateValues=['Has primary user','No primary user'];
  const activePlatform=platformsSelected.length===1?platformsSelected[0]:null;
  const platformSpecific=platformFilterFor(activePlatform);
  const platformSpecificValues=useMemo(()=>platformSpecific?unique(devices.filter(d=>platformName(platformFamily(d.platform))===activePlatform).map(d=>platformSpecific.value(d))):[],[rows,activePlatform,platformSpecific]);

  const standardColumns=useMemo<ExplorerColumn<T>[]>(()=>{
    if(!isDevices)return columns;
    const source=new Map(columns.map(c=>[c.key,c]));
    const fromSource=(key:string,pickerLabel:string,exportLabel=pickerLabel,valueOverride?:ExplorerColumn<T>['value']):ExplorerColumn<T>|null=>{
      const column=source.get(key);
      return column?{...column,pickerLabel,exportLabel,value:valueOverride??column.value}:null;
    };
    const result:(ExplorerColumn<T>|null)[]=[
      {key:'std:deviceId',label:'Device ID',pickerLabel:'Device ID',exportLabel:'Device ID',value:(row:T)=>deviceOf(row).id||''},
      fromSource('device','Device name','Device name'),
      {key:'std:serialNumber',label:'Serial number',pickerLabel:'Serial number',exportLabel:'Serial number',value:(row:T)=>deviceOf(row).serialNumber||''},
      fromSource('platform','Platform'),
      fromSource('os','OS version'),
      fromSource('manufacturer','Manufacturer'),
      fromSource('model','Model'),
      fromSource('user','Primary user display name','Primary user display name',(row:T)=>deviceOf(row).userDisplayName||''),
      {key:'std:userUpn',label:'Primary user UPN',pickerLabel:'Primary user UPN',exportLabel:'Primary user UPN',value:(row:T)=>deviceOf(row).userUpn||''},
      fromSource('compliance','Compliance'),
      {key:'std:encryption',label:'Encryption',pickerLabel:'Encryption',exportLabel:'Encryption',value:(row:T)=>encryption(deviceOf(row))},
      {key:'std:ownership',label:'Ownership',pickerLabel:'Ownership',exportLabel:'Ownership',value:(row:T)=>deviceOf(row).ownership||''},
      {key:'std:managedBy',label:'Managed by',pickerLabel:'Managed by',exportLabel:'Managed by',value:(row:T)=>deviceOf(row).managedBy||''},
      fromSource('checkin','Last check-in')
    ];
    const known=new Set(result.filter((c):c is ExplorerColumn<T>=>Boolean(c)).map(c=>c.key));
    return [...result.filter((c):c is ExplorerColumn<T>=>Boolean(c)),...columns.filter(c=>!known.has(c.key))];
  },[columns,isDevices]);

  const originalColumns=useMemo<ExplorerColumn<T>[]>(()=>{
    if(!isDevices)return [];
    const names=[...new Set(devices.flatMap(d=>Object.keys(d.raw||{})))];
    return names.map(name=>({key:`raw:${name}`,label:name,pickerLabel:name,exportLabel:name,value:(row:T)=>deviceOf(row).raw?.[name]||'',rawField:true}));
  },[rows,isDevices]);
  const effectiveColumns=useMemo<ExplorerColumn<T>[]>(()=>[...standardColumns,...originalColumns],[standardColumns,originalColumns]);

  const activeFilterCount=[platformsSelected,manufacturersSelected,modelsSelected,osVersionsSelected,compliancesSelected,encryptionsSelected,ownershipsSelected,userStatesSelected,platformSpecificSelected].filter(v=>v.length).length+(maxAge<180?1:0);
  const trimmedSearch=searchQuery.trim();
  const hasSearch=Boolean(trimmedSearch);

  const filteredRows=useMemo(()=>!isDevices?rows:rows.filter(row=>{
    const d=deviceOf(row);
    if(platformsSelected.length&&!platformsSelected.includes(platformName(platformFamily(d.platform))))return false;
    if(manufacturersSelected.length&&!manufacturersSelected.includes(d.manufacturer||''))return false;
    if(modelsSelected.length&&!modelsSelected.includes(d.model||''))return false;
    if(osVersionsSelected.length&&!osVersionsSelected.includes(d.osVersion||''))return false;
    if(compliancesSelected.length&&!compliancesSelected.includes(d.compliance||''))return false;
    if(encryptionsSelected.length&&!encryptionsSelected.includes(encryption(d)))return false;
    if(ownershipsSelected.length&&!ownershipsSelected.includes(d.ownership||''))return false;
    const hasUser=Boolean(d.userUpn||d.userDisplayName);const userState=hasUser?'Has primary user':'No primary user';
    if(userStatesSelected.length&&!userStatesSelected.includes(userState))return false;
    if(platformSpecific&&platformSpecificSelected.length&&!platformSpecificSelected.includes(platformSpecific.value(d)))return false;
    const age=ageDays(d.lastCheckIn);
    if(maxAge<180&&(age===null||age>maxAge))return false;
    return true;
  }),[rows,isDevices,platformsSelected,manufacturersSelected,modelsSelected,osVersionsSelected,compliancesSelected,encryptionsSelected,ownershipsSelected,userStatesSelected,platformSpecificSelected,platformSpecific,maxAge]);

  useEffect(()=>{
    setColumnOrder(order=>{
      const valid=order.filter(key=>effectiveColumns.some(column=>column.key===key));
      const missing=effectiveColumns.map(column=>column.key).filter(key=>!valid.includes(key));
      return [...valid,...missing];
    });
  },[effectiveColumns]);

  const orderedColumns=useMemo(()=>columnOrder.map(key=>effectiveColumns.find(column=>column.key===key)).filter((column):column is ExplorerColumn<T>=>Boolean(column)),[columnOrder,effectiveColumns]);
  const shownColumns=orderedColumns.filter(c=>visibleKeys.includes(c.key));

  useEffect(()=>setPage(1),[filteredRows,pageSize]);
  useEffect(()=>setVisibleKeys(keys=>{const valid=keys.filter(k=>effectiveColumns.some(c=>c.key===k));return valid.length?valid:columns.map(c=>c.key)}),[effectiveColumns,columns]);

  const sorted=useMemo(()=>{
    const column=effectiveColumns.find(c=>c.key===sortKey);
    if(!column)return [...filteredRows];
    const direction=sortDirection==='asc'?1:-1;
    return [...filteredRows].sort((a,b)=>{const av=normalize(column.value(a));const bv=normalize(column.value(b));if(column.numeric)return(Number(av)-Number(bv))*direction;return String(av).localeCompare(String(bv),undefined,{numeric:true,sensitivity:'base'})*direction});
  },[filteredRows,effectiveColumns,sortKey,sortDirection]);

  const pageCount=Math.max(1,Math.ceil(sorted.length/pageSize));
  const safePage=Math.min(page,pageCount);
  const start=(safePage-1)*pageSize;
  const visible=sorted.slice(start,start+pageSize);
  const first=sorted.length?start+1:0;
  const last=Math.min(start+pageSize,sorted.length);
  const emptyMessage=hasSearch&&activeFilterCount
    ?'No devices match the current search and filters. Try clearing one or both.'
    :hasSearch
      ?`No devices match “${trimmedSearch}”. Try a different search or clear it.`
      :activeFilterCount
        ?'No devices match the current filters.'
        :'There are no devices available in the current inventory.';

  function sort(column:SmartColumn<T>){if(sortKey===column.key)setSortDirection(d=>d==='asc'?'desc':'asc');else{setSortKey(column.key);setSortDirection('asc')}setPage(1)}
  function exportCsv(){const csv=[shownColumns.map(c=>csvCell(c.exportLabel??c.label)).join(','),...sorted.map(row=>shownColumns.map(c=>csvCell(c.value(row))).join(','))].join('\r\n');const blob=new Blob(['\uFEFF',csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`${exportName}.csv`;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url)}
  function clearFilters(){setPlatformsSelected([]);setManufacturersSelected([]);setModelsSelected([]);setOsVersionsSelected([]);setCompliancesSelected([]);setEncryptionsSelected([]);setOwnershipsSelected([]);setUserStatesSelected([]);setPlatformSpecificSelected([]);setMaxAge(180);onClearFilters?.()}
  function toggleColumn(key:string){setVisibleKeys(keys=>keys.includes(key)?(keys.length>1?keys.filter(k=>k!==key):keys):[...keys,key])}
  function moveColumn(sourceKey:string,targetKey:string){
    if(sourceKey===targetKey)return;
    setColumnOrder(order=>{
      const sourceIndex=order.indexOf(sourceKey);
      const targetIndex=order.indexOf(targetKey);
      if(sourceIndex<0||targetIndex<0)return order;
      const next=[...order];
      next.splice(sourceIndex,1);
      next.splice(targetIndex,0,sourceKey);
      return next;
    });
  }

  return <>
    {isDevices&&<div className="deviceFilterShell">
      <div className="deviceFilterTop"><div><strong>Explore devices</strong><span>{sorted.length.toLocaleString()} of {rows.length.toLocaleString()} devices</span></div><div><button className="tableExport deviceTopExport" onClick={exportCsv}><span>↓</span> Export CSV</button></div></div>
      <div className="deviceFilterPanel">
        <MultiSelect label="Platform" values={platformValues} selected={platformsSelected} onChange={values=>{setPlatformsSelected(values);setPlatformSpecificSelected([])}} allLabel="All platforms"/>
        <MultiSelect label="Manufacturer" values={manufacturers} selected={manufacturersSelected} onChange={values=>{setManufacturersSelected(values);setModelsSelected([])}} allLabel="All manufacturers"/>
        <MultiSelect label="Model" values={models} selected={modelsSelected} onChange={setModelsSelected} allLabel="All models"/>
        <MultiSelect label="OS version" values={osVersions} selected={osVersionsSelected} onChange={setOsVersionsSelected} allLabel="All versions"/>
        <MultiSelect label="Compliance" values={compliances} selected={compliancesSelected} onChange={setCompliancesSelected} allLabel="All states"/>
        <MultiSelect label="Encryption" values={encryptionValues} selected={encryptionsSelected} onChange={setEncryptionsSelected} allLabel="All states"/>
        <MultiSelect label="Ownership" values={ownerships} selected={ownershipsSelected} onChange={setOwnershipsSelected} allLabel="All ownership"/>
        <MultiSelect label="Primary user" values={userStateValues} selected={userStatesSelected} onChange={setUserStatesSelected} allLabel="Any"/>
        {platformSpecific&&<MultiSelect className="platformSpecificFilter" label={platformSpecific.label} values={platformSpecificValues} selected={platformSpecificSelected} onChange={setPlatformSpecificSelected} allLabel={platformSpecific.allLabel}/>} 
        <div className={`ageSlider ${maxAge<180?'hasValue':''}`}><span>Checked in within <b>{maxAge>=180?'180+':maxAge} days</b>{maxAge<180&&<button type="button" className="sliderFilterClear" onClick={()=>setMaxAge(180)} aria-label="Clear check-in filter" title="Clear check-in filter">×</button>}</span><input aria-label="Checked in within days" type="range" min="1" max="180" value={maxAge} onChange={e=>setMaxAge(Number(e.target.value))}/><div><small>1 day</small><small>30</small><small>90</small><small>180+</small></div></div>
      </div>
    </div>}
    <div className={`tableToolbar ${isDevices?'deviceTableToolbar':''}`}><div className="tableResultCount"><strong>{sorted.length.toLocaleString()}</strong><span>{isDevices?`of ${rows.length.toLocaleString()} devices${activeFilterCount?` · ${activeFilterCount} filter${activeFilterCount===1?'':'s'} active`:''}`:'items'}</span></div><div className="tableToolbarActions">{isDevices?<>{activeFilterCount>0&&<button className="clearExplorer toolbarClearFilters" onClick={clearFilters}>Clear filters</button>}<button className={`tableExport tableColumns ${columnsOpen?'active':''}`} onClick={()=>setColumnsOpen(v=>!v)}><svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="5" height="14" rx="1.2"/><rect x="9.5" y="5" width="5" height="14" rx="1.2"/><rect x="16" y="5" width="5" height="14" rx="1.2"/></svg><span>Columns</span><b>{shownColumns.length}</b></button></>:<><label><span>Rows</span><select value={pageSize} onChange={e=>setPageSize(Number(e.target.value))}>{pageSizes.map(size=><option key={size} value={size}>{size}</option>)}</select></label><button className="tableExport" onClick={exportCsv}><span>↓</span> Export CSV</button></>}</div></div>
    {isDevices&&columnsOpen&&<div className="columnPicker enhancedColumnPicker"><div className="columnPickerIntro"><strong>Columns & export fields</strong><span>Select normalized analyzer fields or original fields from the Intune export. CSV export uses exactly this selection.</span><div><button type="button" onClick={()=>setVisibleKeys(standardColumns.map(c=>c.key))}>Standard only</button><button type="button" onClick={()=>setVisibleKeys(effectiveColumns.map(c=>c.key))}>Select all</button></div></div><div className="columnGroups"><section><header>Standard fields <span>{standardColumns.length}</span></header><div>{standardColumns.map(c=><label key={c.key}><input type="checkbox" checked={visibleKeys.includes(c.key)} onChange={()=>toggleColumn(c.key)}/><span title={c.pickerLabel??c.label}>{c.pickerLabel??c.label}</span></label>)}</div></section><section><header>Original Intune fields <span>{originalColumns.length}</span></header><div className="rawColumnList">{originalColumns.map(c=><label key={c.key}><input type="checkbox" checked={visibleKeys.includes(c.key)} onChange={()=>toggleColumn(c.key)}/><span title={c.label}>{c.label}</span></label>)}</div></section></div></div>}
    <div className="tableWrap smartTableWrap"><table className="smartTable"><thead><tr>{shownColumns.map(column=><th key={column.key} data-column-key={column.key} className={`${sortKey===column.key?'sorted':''} ${draggedColumn===column.key?'columnDragging':''} ${dropColumn===column.key&&draggedColumn!==column.key?'columnDropTarget':''}`} onDragOver={event=>{if(!isDevices||!draggedColumn||draggedColumn===column.key)return;event.preventDefault();event.dataTransfer.dropEffect='move';setDropColumn(column.key)}} onDragLeave={()=>dropColumn===column.key&&setDropColumn(null)} onDrop={event=>{if(!isDevices||!draggedColumn)return;event.preventDefault();moveColumn(draggedColumn,column.key);setDraggedColumn(null);setDropColumn(null)}}><button onClick={()=>sort(column)}>{isDevices&&<span className="columnDragHandle" draggable onMouseDown={event=>event.stopPropagation()} onClick={event=>event.stopPropagation()} onDragStart={event=>{event.stopPropagation();setDraggedColumn(column.key);setDropColumn(null);event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',column.key)}} onDragEnd={()=>{setDraggedColumn(null);setDropColumn(null)}} title={`Drag to move ${column.label}`} aria-label={`Drag to move ${column.label}`}><DragIcon/></span>}<span>{column.label}</span><i><SortIcon active={sortKey===column.key} direction={sortDirection}/></i></button></th>)}</tr></thead><tbody>{visible.length?visible.map(row=><tr key={rowKey(row)} className={onRowClick?'clickRow':''} onClick={()=>onRowClick?.(row)}>{shownColumns.map(column=><td key={column.key}>{displayCell(column,row)}</td>)}</tr>):<tr className="emptyStateRow"><td colSpan={Math.max(1,shownColumns.length)}><div className="deviceEmptyState"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 6h16M7 12h10M10 18h4"/><circle cx="18" cy="18" r="3"/><path d="m20.2 20.2 2 2"/></svg><strong>No devices found</strong><p>{emptyMessage}</p>{(activeFilterCount>0||hasSearch)&&<div className="deviceEmptyActions">{activeFilterCount>0&&<button type="button" onClick={clearFilters}>Clear filters</button>}{hasSearch&&onClearSearch&&<button type="button" onClick={onClearSearch}>Clear search</button>}</div>}</div></td></tr>}</tbody></table></div>
    <div className={`tablePager ${isDevices?'deviceTablePager':''}`}><span>{sorted.length?<>Showing <strong>{first.toLocaleString()}</strong>–<strong>{last.toLocaleString()}</strong> of <strong>{sorted.length.toLocaleString()}</strong></>:<>No matching devices</>}</span><div className="pagerActions">{isDevices&&<label className="pagerRows"><span>Rows</span><select value={pageSize} onChange={e=>setPageSize(Number(e.target.value))}>{pageSizes.map(size=><option key={size} value={size}>{size}</option>)}</select></label>}<button disabled={safePage<=1} onClick={()=>setPage(1)}>«</button><button disabled={safePage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>‹</button><span>Page <strong>{safePage}</strong> of <strong>{pageCount}</strong></span><button disabled={safePage>=pageCount} onClick={()=>setPage(p=>Math.min(pageCount,p+1))}>›</button><button disabled={safePage>=pageCount} onClick={()=>setPage(pageCount)}>»</button></div></div>
  </>;
}
