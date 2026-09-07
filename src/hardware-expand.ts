export {};

const COLLAPSE_AFTER=5;
const TARGET_TITLES=new Set(['Manufacturers','Models']);

function setupCard(card:HTMLElement){
  const title=card.querySelector<HTMLElement>('.dashboardCardHead h2')?.textContent?.trim();
  if(!title||!TARGET_TITLES.has(title))return;

  const list=card.querySelector<HTMLElement>('.distributionList');
  if(!list)return;

  const rows=Array.from(list.children).filter((child):child is HTMLElement=>child instanceof HTMLElement);
  let toggle=card.querySelector<HTMLButtonElement>(':scope > .hardwareExpandToggle');

  if(rows.length<=COLLAPSE_AFTER){
    card.removeAttribute('data-hardware-collapsible');
    card.removeAttribute('data-hardware-expanded');
    toggle?.remove();
    return;
  }

  card.dataset.hardwareCollapsible='true';

  if(!toggle){
    toggle=document.createElement('button');
    toggle.type='button';
    toggle.className='hardwareExpandToggle';
    toggle.addEventListener('click',()=>{
      const expanded=card.dataset.hardwareExpanded==='true';
      card.dataset.hardwareExpanded=expanded?'false':'true';
      updateToggle(card,toggle!,rows.length);
    });
    list.insertAdjacentElement('afterend',toggle);
  }

  updateToggle(card,toggle,rows.length);
}

function updateToggle(card:HTMLElement,toggle:HTMLButtonElement,total:number){
  const expanded=card.dataset.hardwareExpanded==='true';
  toggle.innerHTML=expanded
    ? '<span>Show less</span><svg aria-hidden="true" viewBox="0 0 16 16"><path d="m4.5 9.5 3.5-3 3.5 3"/></svg>'
    : `<span>Show all ${total}</span><svg aria-hidden="true" viewBox="0 0 16 16"><path d="m4.5 6.5 3.5 3 3.5-3"/></svg>`;
  toggle.setAttribute('aria-expanded',String(expanded));
}

function scan(){
  document.querySelectorAll<HTMLElement>('.dashboardCard.extendedInsightCard').forEach(setupCard);
}

let scheduled=false;
function scheduleScan(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;scan()});
}

const observer=new MutationObserver(scheduleScan);
observer.observe(document.documentElement,{childList:true,subtree:true});
queueMicrotask(scan);
