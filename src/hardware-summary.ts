export {};

type DistributionRow={label:string;count:number;percent:number};
type ArchitectureSource={platform:string;card:HTMLElement;rows:DistributionRow[];total:number};

const ARCHITECTURE_TITLES:[string,string][]=[
  ['Windows','Windows hardware'],
  ['macOS','macOS architecture'],
  ['Linux','Linux architecture']
];

function cardTitle(card:HTMLElement){return card.querySelector<HTMLElement>('.dashboardCardHead h2')?.textContent?.trim()||''}
function findFleetSection(){return Array.from(document.querySelectorAll<HTMLElement>('.dashboardCategory')).find(section=>section.querySelector<HTMLElement>('.dashboardCategoryHead>div>span')?.textContent?.trim()==='Fleet & Hardware')||null}
function findCard(grid:HTMLElement,title:string){return Array.from(grid.querySelectorAll<HTMLElement>(':scope > .dashboardCard')).find(card=>cardTitle(card)===title)||null}
function parseNumber(value:string){const cleaned=value.replace(/[^0-9.-]/g,'');const parsed=Number(cleaned);return Number.isFinite(parsed)?parsed:0}
function readRows(card:HTMLElement):DistributionRow[]{
  const list=card.querySelector<HTMLElement>('.distributionList');
  if(!list)return [];
  return Array.from(list.children).flatMap(child=>{
    if(!(child instanceof HTMLElement))return [];
    const label=child.querySelector<HTMLElement>('.truncate')?.textContent?.trim()||'';
    const count=parseNumber(child.querySelector<HTMLElement>('strong')?.textContent||'0');
    const percent=parseNumber(child.querySelector<HTMLElement>('small')?.textContent||'0');
    return label?[{label,count,percent}]:[];
  });
}
function rowTotal(rows:DistributionRow[]){return rows.reduce((sum,row)=>sum+row.count,0)}
function escapeHtml(value:string){return value.replace(/[&<>"']/g,char=>{if(char==='&')return '&amp;';if(char==='<')return '&lt;';if(char==='>')return '&gt;';if(char==='"')return '&quot;';return '&#39;'})}
function architectureMarkup(sources:ArchitectureSource[]){
  return sources.map(source=>{
    const segments=source.rows.map((row,index)=>`<span class="architectureStackSegment architectureStackSegment${index%4}" style="width:${Math.max(0,Math.min(100,row.percent))}%" title="${escapeHtml(row.label)} ${row.percent.toFixed(1)}%"></span>`).join('');
    const legend=source.rows.map(row=>`<div class="architectureLegendRow"><span>${escapeHtml(row.label)}</span><strong>${row.count.toLocaleString()}</strong><small>${row.percent.toFixed(1)}%</small></div>`).join('');
    return `<section class="architecturePlatformSummary"><header><strong>${source.platform}</strong><span>${source.total.toLocaleString()} ${source.total===1?'device':'devices'}</span></header><div class="architectureStack">${segments}</div><div class="architectureLegend">${legend}</div></section>`;
  }).join('');
}
function ensureArchitectureCard(grid:HTMLElement,sources:ArchitectureSource[]){
  let summary=grid.querySelector<HTMLElement>(':scope > .hardwareArchitectureSummaryCard');
  if(!sources.length){summary?.remove();return}
  if(!summary){summary=document.createElement('article');summary.className='dashboardCard extendedInsightCard hardwareArchitectureSummaryCard';grid.append(summary)}
  const signature=sources.map(source=>`${source.platform}:${source.rows.map(row=>`${row.label}:${row.count}:${row.percent}`).join(',')}`).join('|');
  if(summary.dataset.summarySignature===signature)return;
  summary.dataset.summarySignature=signature;
  summary.innerHTML=`<header class="dashboardCardHead insightCardHead"><div><h2>Processor architecture</h2><p>Architecture distribution across Windows, macOS and Linux devices</p></div></header><div class="architectureSummaryBody">${architectureMarkup(sources)}</div>`;
}
function markCard(card:HTMLElement|null,className:string){if(card&&!card.classList.contains(className))card.classList.add(className)}
function setupFleet(){
  const section=findFleetSection();if(!section)return;
  const grid=section.querySelector<HTMLElement>('.dashboardCategoryContent .extendedInsightGrid.twoInsightGrid');if(!grid)return;
  grid.dataset.hardwareSummaryGrid='true';
  markCard(findCard(grid,'Device types'),'hardwareCardTypes');
  markCard(findCard(grid,'Manufacturers'),'hardwareCardManufacturers');
  markCard(findCard(grid,'Models'),'hardwareCardModels');

  const sources:ArchitectureSource[]=[];
  for(const [platform,title] of ARCHITECTURE_TITLES){
    const card=findCard(grid,title);if(!card)continue;
    card.classList.add('hardwareArchitectureSource');
    const rows=readRows(card);if(rows.length)sources.push({platform,card,rows,total:rowTotal(rows)});
  }
  ensureArchitectureCard(grid,sources);

  const family=findCard(grid,'iOS/iPadOS device family');
  if(family){family.classList.add('hardwareFamilyCard');const rows=readRows(family);family.classList.toggle('hardwareSingleFamily',rows.length===1)}
}

let scheduled=false;
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;setupFleet()})}
const observer=new MutationObserver(schedule);
observer.observe(document.documentElement,{childList:true,subtree:true});
queueMicrotask(setupFleet);
