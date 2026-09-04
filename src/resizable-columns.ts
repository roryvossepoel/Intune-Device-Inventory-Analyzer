export {};

type ResizeState={
  widths:Map<string,number>;
  signature:string;
};

type ResizeFeedback={
  guide:HTMLDivElement;
  tooltip:HTMLDivElement;
};

const states=new WeakMap<HTMLTableElement,ResizeState>();
const MIN_COLUMN_WIDTH=84;
let scanFrame=0;

function isDeviceTable(table:HTMLTableElement){
  if(table.classList.contains('deviceFloatingTable'))return false;
  const card=table.closest('.dataCard');
  return Boolean(card?.querySelector('.deviceFilterShell'));
}

function headerCells(table:HTMLTableElement){
  return Array.from(table.tHead?.querySelectorAll<HTMLTableCellElement>('tr:first-child > th')??[]);
}

function columnLabel(cell:HTMLTableCellElement){
  return cell.querySelector<HTMLSpanElement>('button > span:not(.columnDragHandle)')?.textContent?.trim()||'column';
}

function columnKey(cell:HTMLTableCellElement,index:number){
  return cell.dataset.columnKey||columnLabel(cell)||`column-${index}`;
}

function headerEntries(table:HTMLTableElement){
  return headerCells(table).map((cell,index)=>({cell,key:columnKey(cell,index),index}));
}

function signature(table:HTMLTableElement){
  return headerEntries(table).map(entry=>entry.key).sort().join('\u0001');
}

function setCellWidth(cell:HTMLTableCellElement,width:number){
  const value=`${Math.round(width)}px`;
  cell.style.width=value;
  cell.style.minWidth=value;
  cell.style.maxWidth=value;
}

function applyAllWidths(table:HTMLTableElement,state:ResizeState){
  const entries=headerEntries(table);
  table.classList.add('columnWidthsActive');
  table.style.tableLayout='fixed';
  table.style.minWidth='0';

  let total=0;
  entries.forEach(({cell,key,index})=>{
    const width=state.widths.get(key)??Math.round(cell.getBoundingClientRect().width);
    state.widths.set(key,width);
    total+=width;
    Array.from(table.rows).forEach(row=>{
      const rowCell=row.cells[index];
      if(rowCell)setCellWidth(rowCell,width);
    });
  });
  table.style.width=`${Math.round(total)}px`;
}

function applySingleWidth(table:HTMLTableElement,state:ResizeState,key:string,width:number){
  state.widths.set(key,width);
  applyAllWidths(table,state);
}

function clearWidths(table:HTMLTableElement){
  table.classList.remove('columnWidthsActive');
  table.style.removeProperty('table-layout');
  table.style.removeProperty('min-width');
  table.style.removeProperty('width');
  Array.from(table.rows).forEach(row=>{
    Array.from(row.cells).forEach(cell=>{
      cell.style.removeProperty('width');
      cell.style.removeProperty('min-width');
      cell.style.removeProperty('max-width');
    });
  });
  states.delete(table);
}

function freezeCurrentWidths(table:HTMLTableElement){
  const widths=new Map<string,number>();
  headerEntries(table).forEach(({cell,key})=>widths.set(key,Math.round(cell.getBoundingClientRect().width)));
  const state:ResizeState={widths,signature:signature(table)};
  states.set(table,state);
  applyAllWidths(table,state);
  return state;
}

function createResizeFeedback(cell:HTMLTableCellElement,table:HTMLTableElement,label:string,width:number):ResizeFeedback{
  const guide=document.createElement('div');
  guide.className='columnResizeGuide';
  guide.setAttribute('aria-hidden','true');

  const tooltip=document.createElement('div');
  tooltip.className='columnResizeTooltip';
  tooltip.setAttribute('aria-hidden','true');

  document.body.append(guide,tooltip);
  updateResizeFeedback({guide,tooltip},cell,table,label,width);
  requestAnimationFrame(()=>{
    guide.classList.add('visible');
    tooltip.classList.add('visible');
  });
  return {guide,tooltip};
}

function updateResizeFeedback(feedback:ResizeFeedback,cell:HTMLTableCellElement,table:HTMLTableElement,label:string,width:number){
  const cellRect=cell.getBoundingClientRect();
  const tableRect=table.getBoundingClientRect();
  const top=Math.max(0,cellRect.top);
  const bottom=Math.min(window.innerHeight,tableRect.bottom);
  const height=Math.max(cellRect.height,bottom-top);
  const edge=Math.round(cellRect.right);

  feedback.guide.style.left=`${edge}px`;
  feedback.guide.style.top=`${top}px`;
  feedback.guide.style.height=`${height}px`;

  feedback.tooltip.textContent=`${label} · ${Math.round(width)} px`;
  feedback.tooltip.style.left=`${Math.min(window.innerWidth-170,Math.max(8,edge+10))}px`;
  feedback.tooltip.style.top=`${Math.max(8,Math.min(window.innerHeight-38,cellRect.top+6))}px`;
}

function finishResizeFeedback(feedback:ResizeFeedback){
  feedback.guide.classList.remove('visible');
  feedback.tooltip.classList.remove('visible');
  window.setTimeout(()=>{
    feedback.guide.remove();
    feedback.tooltip.remove();
  },160);
}

function startResize(event:PointerEvent,handle:HTMLElement,cell:HTMLTableCellElement,table:HTMLTableElement){
  if(event.button!==0)return;
  event.preventDefault();
  event.stopPropagation();

  const entries=headerEntries(table);
  const entry=entries.find(item=>item.cell===cell);
  if(!entry)return;

  const state=states.get(table)??freezeCurrentWidths(table);
  const startWidth=state.widths.get(entry.key)??cell.getBoundingClientRect().width??MIN_COLUMN_WIDTH;
  const startX=event.clientX;
  const label=columnLabel(cell);
  let animationFrame=0;
  let latestX=startX;
  let renderedWidth=startWidth;
  const feedback=createResizeFeedback(cell,table,label,startWidth);

  handle.classList.add('resizing');
  cell.classList.add('resizingColumn');
  document.body.classList.add('columnResizeActive');
  handle.setPointerCapture?.(event.pointerId);

  const render=()=>{
    animationFrame=0;
    renderedWidth=Math.max(MIN_COLUMN_WIDTH,startWidth+(latestX-startX));
    applySingleWidth(table,state,entry.key,renderedWidth);
    updateResizeFeedback(feedback,cell,table,label,renderedWidth);
  };

  const move=(moveEvent:PointerEvent)=>{
    latestX=moveEvent.clientX;
    if(!animationFrame)animationFrame=requestAnimationFrame(render);
  };

  const stop=()=>{
    if(animationFrame){cancelAnimationFrame(animationFrame);render()}
    handle.classList.remove('resizing');
    cell.classList.remove('resizingColumn');
    cell.classList.add('resizeComplete');
    document.body.classList.remove('columnResizeActive');
    finishResizeFeedback(feedback);
    window.setTimeout(()=>cell.classList.remove('resizeComplete'),420);
    window.removeEventListener('pointermove',move);
    window.removeEventListener('pointerup',stop);
    window.removeEventListener('pointercancel',stop);
  };

  window.addEventListener('pointermove',move,{passive:true});
  window.addEventListener('pointerup',stop,{once:true});
  window.addEventListener('pointercancel',stop,{once:true});
}

function addHandle(table:HTMLTableElement,cell:HTMLTableCellElement){
  const existing=cell.querySelector<HTMLElement>(':scope > .columnResizeHandle');
  if(existing?.dataset.resizeVersion==='3')return;
  existing?.remove();
  cell.classList.add('resizableColumnHeader');

  const handle=document.createElement('span');
  handle.className='columnResizeHandle';
  handle.dataset.resizeVersion='3';
  handle.setAttribute('role','separator');
  handle.setAttribute('aria-orientation','vertical');
  handle.setAttribute('aria-label',`Resize ${columnLabel(cell)}`);
  handle.title='Drag this edge to resize the column. Double-click to reset all column widths.';
  handle.addEventListener('pointerdown',event=>startResize(event,handle,cell,table));
  handle.addEventListener('dblclick',event=>{
    event.preventDefault();
    event.stopPropagation();
    clearWidths(table);
  });
  cell.appendChild(handle);
}

function addOverflowTitles(table:HTMLTableElement){
  if(table.dataset.resizeOverflowTitles==='true')return;
  table.dataset.resizeOverflowTitles='true';
  table.addEventListener('pointerover',event=>{
    if(!table.classList.contains('columnWidthsActive'))return;
    const cell=(event.target as Element).closest<HTMLTableCellElement>('td');
    if(!cell||!table.contains(cell)||cell.querySelector('[title]'))return;
    if(cell.scrollWidth>cell.clientWidth){
      cell.title=cell.textContent?.trim()||'';
      cell.dataset.resizeGeneratedTitle='true';
    }else if(cell.dataset.resizeGeneratedTitle==='true'){
      cell.removeAttribute('title');
      delete cell.dataset.resizeGeneratedTitle;
    }
  });
}

function enhanceTable(table:HTMLTableElement){
  if(!isDeviceTable(table))return;
  const cells=headerCells(table);
  if(!cells.length)return;

  const currentSignature=signature(table);
  const state=states.get(table);
  if(state&&state.signature!==currentSignature)clearWidths(table);

  cells.forEach(cell=>addHandle(table,cell));
  addOverflowTitles(table);

  const currentState=states.get(table);
  if(currentState)applyAllWidths(table,currentState);
}

function scan(){
  cancelAnimationFrame(scanFrame);
  scanFrame=requestAnimationFrame(()=>{
    document.querySelectorAll<HTMLTableElement>('table.smartTable').forEach(enhanceTable);
  });
}

const observer=new MutationObserver(scan);
observer.observe(document.documentElement,{childList:true,subtree:true});
window.addEventListener('resize',scan,{passive:true});
queueMicrotask(scan);
