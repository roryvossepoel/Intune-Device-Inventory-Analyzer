type ResizeState={
  widths:number[];
  signature:string;
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

function signature(table:HTMLTableElement){
  return headerCells(table).map(cell=>cell.querySelector('button > span')?.textContent?.trim()??'').join('\u0001');
}

function setCellWidth(cell:HTMLTableCellElement,width:number){
  const value=`${Math.round(width)}px`;
  cell.style.width=value;
  cell.style.minWidth=value;
  cell.style.maxWidth=value;
}

function applyAllWidths(table:HTMLTableElement,state:ResizeState){
  table.classList.add('columnWidthsActive');
  table.style.tableLayout='fixed';
  table.style.minWidth='0';
  table.style.width=`${Math.round(state.widths.reduce((sum,width)=>sum+width,0))}px`;
  Array.from(table.rows).forEach(row=>{
    Array.from(row.cells).forEach((cell,index)=>{
      const width=state.widths[index];
      if(width!==undefined)setCellWidth(cell,width);
    });
  });
}

function applySingleWidth(table:HTMLTableElement,state:ResizeState,index:number,width:number){
  state.widths[index]=width;
  table.style.width=`${Math.round(state.widths.reduce((sum,value)=>sum+value,0))}px`;
  Array.from(table.rows).forEach(row=>{
    const cell=row.cells[index];
    if(cell)setCellWidth(cell,width);
  });
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
  const widths=headerCells(table).map(cell=>Math.round(cell.getBoundingClientRect().width));
  const state:ResizeState={widths,signature:signature(table)};
  states.set(table,state);
  applyAllWidths(table,state);
  return state;
}

function startResize(event:PointerEvent,handle:HTMLElement,index:number,table:HTMLTableElement){
  if(event.button!==0)return;
  event.preventDefault();
  event.stopPropagation();

  const state=states.get(table)??freezeCurrentWidths(table);
  const startWidth=state.widths[index]??headerCells(table)[index]?.getBoundingClientRect().width??MIN_COLUMN_WIDTH;
  const startX=event.clientX;
  let animationFrame=0;
  let latestX=startX;

  handle.classList.add('resizing');
  document.body.classList.add('columnResizeActive');
  handle.setPointerCapture?.(event.pointerId);

  const render=()=>{
    animationFrame=0;
    const nextWidth=Math.max(MIN_COLUMN_WIDTH,startWidth+(latestX-startX));
    applySingleWidth(table,state,index,nextWidth);
  };

  const move=(moveEvent:PointerEvent)=>{
    latestX=moveEvent.clientX;
    if(!animationFrame)animationFrame=requestAnimationFrame(render);
  };

  const stop=()=>{
    if(animationFrame){cancelAnimationFrame(animationFrame);render()}
    handle.classList.remove('resizing');
    document.body.classList.remove('columnResizeActive');
    window.removeEventListener('pointermove',move);
    window.removeEventListener('pointerup',stop);
    window.removeEventListener('pointercancel',stop);
  };

  window.addEventListener('pointermove',move,{passive:true});
  window.addEventListener('pointerup',stop,{once:true});
  window.addEventListener('pointercancel',stop,{once:true});
}

function addHandle(table:HTMLTableElement,cell:HTMLTableCellElement,index:number){
  if(cell.querySelector(':scope > .columnResizeHandle'))return;
  cell.classList.add('resizableColumnHeader');

  const handle=document.createElement('span');
  handle.className='columnResizeHandle';
  handle.setAttribute('role','separator');
  handle.setAttribute('aria-orientation','vertical');
  handle.setAttribute('aria-label',`Resize ${cell.querySelector('button > span')?.textContent?.trim()||'column'}`);
  handle.title='Drag to resize column. Double-click to reset column widths.';
  handle.addEventListener('pointerdown',event=>startResize(event,handle,index,table));
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

  cells.forEach((cell,index)=>addHandle(table,cell,index));
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
