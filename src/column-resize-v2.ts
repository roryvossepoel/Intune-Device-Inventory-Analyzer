export {};

type ResizeState={widths:Map<string,number>;signature:string};
type ActiveResize={table:HTMLTableElement;cell:HTMLTableCellElement;key:string;startX:number;startWidth:number;state:ResizeState;guide:HTMLDivElement;tooltip:HTMLDivElement;label:string};

const states=new WeakMap<HTMLTableElement,ResizeState>();
const MIN_WIDTH=84;
const HIT_ZONE=8;
const COLGROUP_CLASS='columnResizeV2Group';
let active:ActiveResize|null=null;
let hoverCell:HTMLTableCellElement|null=null;

function isDeviceTable(table:HTMLTableElement){
  if(table.classList.contains('deviceFloatingTable'))return false;
  const card=table.closest('.dataCard');
  return Boolean(card?.querySelector('.deviceFilterShell'));
}

function headers(table:HTMLTableElement){
  return Array.from(table.tHead?.querySelectorAll<HTMLTableCellElement>('tr:first-child > th')??[]);
}

function labelOf(cell:HTMLTableCellElement){
  return cell.querySelector<HTMLSpanElement>('button > span:not(.columnDragHandle)')?.textContent?.trim()||'Column';
}

function keyOf(cell:HTMLTableCellElement,index:number){
  return cell.dataset.columnKey||labelOf(cell)||`column-${index}`;
}

function entries(table:HTMLTableElement){
  return headers(table).map((cell,index)=>({cell,index,key:keyOf(cell,index)}));
}

function signature(table:HTMLTableElement){
  return entries(table).map(item=>item.key).sort().join('\u0001');
}

function setCellWidth(cell:HTMLTableCellElement,width:number){
  const value=`${Math.round(width)}px`;
  cell.style.setProperty('width',value,'important');
  cell.style.setProperty('min-width',value,'important');
  cell.style.setProperty('max-width',value,'important');
}

function ensureColgroup(table:HTMLTableElement,count:number){
  let group=table.querySelector<HTMLTableColElement>(`:scope > colgroup.${COLGROUP_CLASS}`);
  if(!group){
    group=document.createElement('colgroup');
    group.className=COLGROUP_CLASS;
    table.insertBefore(group,table.firstChild);
  }
  while(group.children.length<count)group.appendChild(document.createElement('col'));
  while(group.children.length>count)group.lastElementChild?.remove();
  return Array.from(group.querySelectorAll<HTMLTableColElement>('col'));
}

function applyWidths(table:HTMLTableElement,state:ResizeState){
  const list=entries(table);
  if(!list.length)return;

  if(state.signature!==signature(table)){
    clearWidths(table);
    return;
  }

  const resolved=list.map(({cell,index,key})=>{
    const width=state.widths.get(key)??Math.round(cell.getBoundingClientRect().width);
    state.widths.set(key,width);
    return {index,width};
  });

  const total=resolved.reduce((sum,item)=>sum+item.width,0);
  const tableWidth=`${Math.round(total)}px`;
  table.classList.add('columnWidthsActive');
  table.style.setProperty('table-layout','fixed','important');
  table.style.setProperty('width',tableWidth,'important');
  table.style.setProperty('min-width',tableWidth,'important');

  const cols=ensureColgroup(table,resolved.length);
  resolved.forEach(({index,width})=>{
    cols[index]?.style.setProperty('width',`${Math.round(width)}px`,'important');
    Array.from(table.rows).forEach(row=>{
      const cell=row.cells[index];
      if(cell)setCellWidth(cell,width);
    });
  });
}

function freeze(table:HTMLTableElement){
  const widths=new Map<string,number>();
  entries(table).forEach(({cell,key})=>widths.set(key,Math.round(cell.getBoundingClientRect().width)));
  const state={widths,signature:signature(table)};
  states.set(table,state);
  applyWidths(table,state);
  return state;
}

function clearWidths(table:HTMLTableElement){
  table.classList.remove('columnWidthsActive');
  table.style.removeProperty('table-layout');
  table.style.removeProperty('width');
  table.style.removeProperty('min-width');
  table.querySelector(`:scope > colgroup.${COLGROUP_CLASS}`)?.remove();
  Array.from(table.rows).forEach(row=>Array.from(row.cells).forEach(cell=>{
    cell.style.removeProperty('width');
    cell.style.removeProperty('min-width');
    cell.style.removeProperty('max-width');
  }));
  states.delete(table);
}

function tableAtPoint(x:number,y:number){
  const element=document.elementFromPoint(x,y);
  const table=element?.closest<HTMLTableElement>('table.smartTable')??null;
  return table&&isDeviceTable(table)?table:null;
}

function edgeCell(table:HTMLTableElement,x:number,y:number){
  let match:HTMLTableCellElement|null=null;
  let distance=Infinity;
  for(const cell of headers(table)){
    const rect=cell.getBoundingClientRect();
    if(y<rect.top||y>rect.bottom)continue;
    const d=Math.abs(x-rect.right);
    if(d<=HIT_ZONE&&d<distance){match=cell;distance=d}
  }
  return match;
}

function setHover(cell:HTMLTableCellElement|null){
  if(hoverCell===cell)return;
  hoverCell?.classList.remove('columnResizeEdgeHover');
  hoverCell=cell;
  hoverCell?.classList.add('columnResizeEdgeHover');
}

function createFeedback(cell:HTMLTableCellElement,label:string,width:number){
  const guide=document.createElement('div');
  guide.className='columnResizeGuide visible';
  guide.setAttribute('aria-hidden','true');
  const tooltip=document.createElement('div');
  tooltip.className='columnResizeTooltip visible';
  tooltip.setAttribute('aria-hidden','true');
  document.body.append(guide,tooltip);
  updateFeedback({guide,tooltip} as Pick<ActiveResize,'guide'|'tooltip'>,cell,label,width);
  return {guide,tooltip};
}

function updateFeedback(feedback:Pick<ActiveResize,'guide'|'tooltip'>,cell:HTMLTableCellElement,label:string,width:number){
  const rect=cell.getBoundingClientRect();
  const table=cell.closest<HTMLTableElement>('table.smartTable');
  const tableRect=table?.getBoundingClientRect();
  const top=Math.max(0,rect.top);
  const bottom=Math.min(window.innerHeight,tableRect?.bottom??rect.bottom);
  feedback.guide.style.left=`${Math.round(rect.right)}px`;
  feedback.guide.style.top=`${top}px`;
  feedback.guide.style.height=`${Math.max(rect.height,bottom-top)}px`;
  feedback.tooltip.textContent=`${label} · ${Math.round(width)} px`;
  feedback.tooltip.style.left=`${Math.min(window.innerWidth-170,Math.max(8,rect.right+10))}px`;
  feedback.tooltip.style.top=`${Math.max(8,Math.min(window.innerHeight-38,rect.top+6))}px`;
}

function finish(){
  if(!active)return;
  const {cell,guide,tooltip}=active;
  cell.classList.remove('resizingColumn');
  cell.classList.add('resizeComplete');
  window.setTimeout(()=>cell.classList.remove('resizeComplete'),420);
  guide.remove();
  tooltip.remove();
  document.body.classList.remove('columnResizeActive');
  active=null;
}

document.addEventListener('mousemove',event=>{
  if(active){
    const width=Math.max(MIN_WIDTH,active.startWidth+(event.clientX-active.startX));
    active.state.widths.set(active.key,width);
    applyWidths(active.table,active.state);
    updateFeedback(active,active.cell,active.label,width);
    return;
  }
  const table=tableAtPoint(event.clientX,event.clientY);
  setHover(table?edgeCell(table,event.clientX,event.clientY):null);
},true);

document.addEventListener('mousedown',event=>{
  if(event.button!==0)return;
  const table=tableAtPoint(event.clientX,event.clientY);
  if(!table)return;
  const cell=edgeCell(table,event.clientX,event.clientY);
  if(!cell)return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  const entry=entries(table).find(item=>item.cell===cell);
  if(!entry)return;
  const state=states.get(table)??freeze(table);
  const startWidth=state.widths.get(entry.key)??cell.getBoundingClientRect().width;
  const label=labelOf(cell);
  const feedback=createFeedback(cell,label,startWidth);
  active={table,cell,key:entry.key,startX:event.clientX,startWidth,state,label,...feedback};
  cell.classList.add('resizingColumn');
  document.body.classList.add('columnResizeActive');
  setHover(cell);
},true);

document.addEventListener('mouseup',()=>finish(),true);
window.addEventListener('blur',()=>finish());

document.addEventListener('dblclick',event=>{
  const table=tableAtPoint(event.clientX,event.clientY);
  if(!table||!edgeCell(table,event.clientX,event.clientY))return;
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  clearWidths(table);
},true);

new MutationObserver(()=>{
  document.querySelectorAll<HTMLTableElement>('table.smartTable').forEach(table=>{
    if(!isDeviceTable(table))return;
    const state=states.get(table);
    if(state)requestAnimationFrame(()=>applyWidths(table,state));
  });
}).observe(document.documentElement,{childList:true,subtree:true});
