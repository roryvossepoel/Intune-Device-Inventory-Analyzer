export {};

type SortField='version'|'devices';
type SortDirection='asc'|'desc';
type VersionRecord={label:string;count:number;element:HTMLElement;version:number[]};
type CardState={records:VersionRecord[];platform:string;list:HTMLElement;renderKey?:string};

const cardStates=new WeakMap<HTMLElement,CardState>();
let sortField:SortField='version';
let direction:SortDirection='desc';
let scheduled=false;

const number=(value:string)=>Number(value.replace(/[^0-9]/g,''))||0;
const labelOf=(row:HTMLElement)=>row.querySelector<HTMLElement>('.truncate')?.textContent?.trim()||'';
const countOf=(row:HTMLElement)=>number(row.querySelector<HTMLElement>('strong')?.textContent||'0');

function windowsReleaseLabel(label:string){
  const release=label.match(/Windows\s+11(?:,\s*version)?\s*(23H2|24H2|25H2)/i)?.[1]?.toUpperCase();
  if(release)return `Windows 11 ${release}`;
  const build=label.match(/(?:10\.0\.)?(22631|26100|26200)(?:\.|\b)/)?.[1];
  if(build==='22631')return 'Windows 11 23H2';
  if(build==='26100')return 'Windows 11 24H2';
  if(build==='26200')return 'Windows 11 25H2';
  return label.replace(/,\s*version\s*/i,' ').replace(/\s*·\s*build\s+.*$/i,'').trim();
}

function versionParts(label:string,platform:string){
  if(platform==='windows'){
    const match=windowsReleaseLabel(label).match(/Windows\s+11\s+(\d{2})H([12])/i);
    if(match)return [2000+Number(match[1]),Number(match[2])];
  }
  const values=label.match(/\d+/g)?.map(Number)??[];
  return values.length?values:[-1];
}

function compareVersionAscending(a:number[],b:number[]){
  const length=Math.max(a.length,b.length);
  for(let i=0;i<length;i++){
    const difference=(a[i]??0)-(b[i]??0);
    if(difference)return difference;
  }
  return 0;
}

function platformOf(card:HTMLElement){
  if(card.querySelector('.platformCardLogo-windows'))return 'windows';
  if(card.querySelector('.platformCardLogo-android'))return 'android';
  if(card.querySelector('.platformCardLogo-applemobile'))return 'applemobile';
  if(card.querySelector('.platformCardLogo-macos'))return 'macos';
  if(card.querySelector('.platformCardLogo-linux'))return 'linux';
  const title=card.querySelector('h2')?.textContent||'';
  return title.toLowerCase().split(' ')[0];
}

function capture(card:HTMLElement):CardState|null{
  const list=card.querySelector<HTMLElement>('.distributionList');
  if(!list)return null;
  const previous=cardStates.get(card);
  const platform=platformOf(card);
  const rows=[...list.children].filter((node):node is HTMLElement=>node instanceof HTMLElement&&!node.dataset.osSortGenerated);
  if(!rows.length)return previous??null;
  const records=rows.map(element=>{
    const rawLabel=labelOf(element);
    const label=platform==='windows'?windowsReleaseLabel(rawLabel):rawLabel;
    return {label,count:countOf(element),element,version:versionParts(label,platform)};
  });
  const state:CardState={records,platform,list};
  cardStates.set(card,state);
  return state;
}

function groupedWindows(records:VersionRecord[]){
  const grouped=new Map<string,VersionRecord>();
  for(const record of records){
    const existing=grouped.get(record.label);
    if(existing){existing.count+=record.count;continue}
    grouped.set(record.label,{...record});
  }
  return [...grouped.values()];
}

function sorted(records:VersionRecord[]){
  const factor=direction==='asc'?1:-1;
  return [...records].sort((a,b)=>{
    const primary=sortField==='devices'?(a.count-b.count):compareVersionAscending(a.version,b.version);
    if(primary)return primary*factor;
    const secondary=sortField==='devices'?compareVersionAscending(a.version,b.version):(a.count-b.count);
    return secondary*factor;
  });
}

function updateRow(row:HTMLElement,label:string,count:number,total:number){
  row.dataset.osSortGenerated='1';
  const labelNode=row.querySelector<HTMLElement>('.truncate');
  const countNode=row.querySelector<HTMLElement>('strong');
  const percentNode=row.querySelector<HTMLElement>('small');
  const bar=row.querySelector<HTMLElement>('i > b');
  const percentage=total?count/total*100:0;
  const rounded=Math.round(percentage*10)/10;
  const pct=`${Number.isInteger(rounded)?rounded.toFixed(0):rounded.toFixed(1)}%`;
  if(labelNode){labelNode.textContent=label;labelNode.title=label}
  if(countNode)countNode.textContent=count.toLocaleString();
  if(percentNode)percentNode.textContent=pct;
  if(bar)bar.style.width=pct;
}

function renderWindows(card:HTMLElement,state:CardState){
  const rows=sorted(groupedWindows(state.records));
  const total=state.records.reduce((sum,row)=>sum+row.count,0);
  const renderKey=`${sortField}:${direction}|${rows.map(row=>`${row.label}:${row.count}`).join('|')}`;
  const allGenerated=[...state.list.children].every(node=>node instanceof HTMLElement&&node.dataset.osSortGenerated==='1');
  if(state.renderKey===renderKey&&allGenerated)return;
  state.list.replaceChildren(...rows.map(record=>{
    const row=document.createElement('div');
    row.innerHTML=record.element.innerHTML;
    row.className='osVersionSummaryRow';
    updateRow(row,record.label,record.count,total);
    return row;
  }));
  state.renderKey=renderKey;
  const subtitle=card.querySelector<HTMLElement>('.insightCardHead p');
  if(subtitle)subtitle.textContent=`${total.toLocaleString()} devices · ${rows.length} reported version${rows.length===1?'':'s'}`;
}

function renderStandard(state:CardState){
  const desired=sorted(state.records).map(record=>record.element);
  const current=[...state.list.children];
  if(current.length===desired.length&&desired.every((element,index)=>current[index]===element))return;
  state.list.append(...desired);
}

function renderCard(card:HTMLElement,state:CardState){
  if(state.platform==='windows')renderWindows(card,state);else renderStandard(state);
}

function enhanceCard(card:HTMLElement){
  let state:CardState|null|undefined=cardStates.get(card);
  const current=[...card.querySelectorAll<HTMLElement>('.distributionList > *')];
  const hasFresh=current.some(row=>!row.dataset.osSortGenerated);
  if(!state||hasFresh&&!state.records.every(record=>current.includes(record.element)))state=capture(card);
  if(!state)return;
  renderCard(card,state);
}

function directionTitle(){
  if(sortField==='version')return direction==='desc'?'Newest version first':'Oldest version first';
  return direction==='desc'?'Most devices first':'Fewest devices first';
}

function updateGlobalControl(section:HTMLElement){
  const control=section.querySelector<HTMLElement>('.osVersionSortGlobal');
  if(!control)return;
  const select=control.querySelector<HTMLSelectElement>('select');
  const button=control.querySelector<HTMLButtonElement>('button');
  if(select)select.value=sortField;
  if(button){
    const title=directionTitle();
    button.title=title;
    button.setAttribute('aria-label',title);
    button.dataset.direction=direction;
  }
}

function addGlobalControl(section:HTMLElement){
  section.classList.add('osVersionSortEnhanced');
  const header=section.querySelector<HTMLElement>('.dashboardCategoryHead');
  if(!header)return;
  if(!header.querySelector('.osVersionSortGlobal')){
    const control=document.createElement('div');
    control.className='osVersionSortGlobal';
    control.innerHTML='<span>Sort</span><select aria-label="Sort OS version cards"><option value="version">Version</option><option value="devices">Devices</option></select><button type="button"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.5v11"/><path d="m4.75 6 3.25-3.5L11.25 6"/></svg></button>';
    const select=control.querySelector<HTMLSelectElement>('select')!;
    const button=control.querySelector<HTMLButtonElement>('button')!;
    select.addEventListener('change',()=>{
      sortField=select.value as SortField;
      direction='desc';
      apply();
    });
    button.addEventListener('click',()=>{
      direction=direction==='desc'?'asc':'desc';
      apply();
    });
    header.append(control);
  }
  updateGlobalControl(section);
}

function normalizePercentageText(root:HTMLElement){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  const nodes:Text[]=[];
  while(walker.nextNode())nodes.push(walker.currentNode as Text);
  for(const node of nodes){
    const value=node.nodeValue;
    if(!value||!value.includes('%'))continue;
    const next=value.replace(/\b(\d+(?:[.,]\d+)?)%/g,(_,raw:string)=>{
      const numberValue=Number(raw.replace(',','.'));
      if(!Number.isFinite(numberValue))return `${raw}%`;
      const rounded=Math.round(numberValue*10)/10;
      return `${Number.isInteger(rounded)?rounded.toFixed(0):rounded.toFixed(1)}%`;
    });
    if(next!==value)node.nodeValue=next;
  }
}

function apply(){
  const dashboard=document.querySelector<HTMLElement>('.inventoryDashboard');
  if(dashboard)normalizePercentageText(dashboard);
  const section=[...document.querySelectorAll<HTMLElement>('.dashboardCategory')].find(item=>item.querySelector('.osVersionsGrid'));
  if(!section)return;
  addGlobalControl(section);
  section.querySelectorAll<HTMLElement>('.osVersionsGrid .platformSpecificCard').forEach(enhanceCard);
  updateGlobalControl(section);
}

function schedule(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;apply()});
}

new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
schedule();
