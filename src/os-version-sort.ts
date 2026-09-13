export {};

type SortMode='version'|'devices';
type VersionRecord={label:string;count:number;element:HTMLElement;version:number[]};
type CardState={records:VersionRecord[];platform:string;list:HTMLElement;renderKey?:string};

const cardStates=new WeakMap<HTMLElement,CardState>();
let sortMode:SortMode='version';
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

function compareVersion(a:number[],b:number[]){
  const length=Math.max(a.length,b.length);
  for(let i=0;i<length;i++){
    const difference=(b[i]??0)-(a[i]??0);
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
  const platform=platformOf(card);
  const rows=[...list.children].filter((node):node is HTMLElement=>node instanceof HTMLElement&&!node.dataset.osSortGenerated);
  if(!rows.length)return cardStates.get(card)??null;
  const records=rows.map(element=>{
    const rawLabel=labelOf(element);
    const label=platform==='windows'?windowsReleaseLabel(rawLabel):rawLabel;
    return {label,count:countOf(element),element,version:versionParts(label,platform)};
  });
  const state:CardState={records,platform,list};
  cardStates.set(card,state);
  return state;
}

function sorted(records:VersionRecord[]){
  return [...records].sort((a,b)=>sortMode==='devices'?(b.count-a.count||compareVersion(a.version,b.version)):(compareVersion(a.version,b.version)||b.count-a.count));
}

function updateRow(row:HTMLElement,label:string,count:number,total:number,index:number){
  row.dataset.osSortGenerated='1';
  const labelNode=row.querySelector<HTMLElement>('.truncate');
  const countNode=row.querySelector<HTMLElement>('strong');
  const percentNode=row.querySelector<HTMLElement>('small');
  const dot=row.querySelector<HTMLElement>('.distributionDot');
  const bar=row.querySelector<HTMLElement>('i > b');
  const percentage=total?count/total*100:0;
  const rounded=Math.round(percentage*10)/10;
  const pct=`${Number.isInteger(rounded)?rounded.toFixed(0):rounded.toFixed(1)}%`;
  if(labelNode){labelNode.textContent=label;labelNode.title=label}
  if(countNode)countNode.textContent=count.toLocaleString();
  if(percentNode)percentNode.textContent=pct;
  if(dot)dot.className=`distributionDot dot${index%6}`;
  if(bar)bar.style.width=pct;
}

function renderWindows(card:HTMLElement,state:CardState){
  const grouped=new Map<string,VersionRecord>();
  for(const record of state.records){
    const existing=grouped.get(record.label);
    if(existing){existing.count+=record.count;continue}
    grouped.set(record.label,{...record});
  }
  const rows=sorted([...grouped.values()]);
  const total=state.records.reduce((sum,row)=>sum+row.count,0);
  const renderKey=`${sortMode}|${rows.map(row=>`${row.label}:${row.count}`).join('|')}`;
  const allGenerated=[...state.list.children].every(node=>node instanceof HTMLElement&&node.dataset.osSortGenerated==='1');
  if(state.renderKey===renderKey&&allGenerated)return;
  state.list.replaceChildren(...rows.map((record,index)=>{
    const row=document.createElement('div');
    row.innerHTML=record.element.innerHTML;
    row.className='osVersionSummaryRow';
    updateRow(row,record.label,record.count,total,index);
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

function enhanceCard(card:HTMLElement){
  let state=cardStates.get(card);
  const current=[...card.querySelectorAll<HTMLElement>('.distributionList > *')];
  const hasFresh=current.some(row=>!row.dataset.osSortGenerated);
  if(!state||hasFresh&&!state.records.every(record=>current.includes(record.element)))state=capture(card);
  if(!state)return;
  if(state.platform==='windows')renderWindows(card,state);else renderStandard(state);
}

function addControl(section:HTMLElement){
  if(section.querySelector('.osVersionSortControl'))return;
  section.classList.add('osVersionSortEnhanced');
  const header=section.querySelector<HTMLElement>('.dashboardCategoryHead');
  if(!header)return;
  const control=document.createElement('label');
  control.className='osVersionSortControl';
  control.innerHTML='<span>Sort</span><select aria-label="Sort OS versions"><option value="version">Newest version</option><option value="devices">Devices</option></select>';
  const select=control.querySelector('select')!;
  select.value=sortMode;
  select.addEventListener('change',()=>{sortMode=select.value as SortMode;apply()});
  header.append(control);
}

function apply(){
  const sections=[...document.querySelectorAll<HTMLElement>('.dashboardCategory')];
  const section=sections.find(item=>item.querySelector('.osVersionsGrid'));
  if(!section)return;
  addControl(section);
  section.querySelectorAll<HTMLElement>('.osVersionsGrid .platformSpecificCard').forEach(enhanceCard);
}

function schedule(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;apply()});
}

new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
schedule();
