export {};

function applyInventoryActivityPolish(){
  const cards=[...document.querySelectorAll<HTMLElement>('.inventoryActivityGrid > .dashboardCard')];
  if(!cards.length)return;

  for(const card of cards){
    const title=card.querySelector('.dashboardCardHead h2')?.textContent?.trim()||'';
    card.classList.remove('inventoryCard-checkin','inventoryCard-enrollment','inventoryCard-quality','quality-tone-good','quality-tone-warn','quality-tone-bad');
    if(title==='Check-in age')card.classList.add('inventoryCard-checkin');
    else if(title==='Enrollment age')card.classList.add('inventoryCard-enrollment');
    else if(title==='Inventory quality')card.classList.add('inventoryCard-quality');
  }

  const quality=cards.find(card=>card.classList.contains('inventoryCard-quality'));
  if(!quality)return;

  let hasBad=false;
  let hasWarn=false;
  const rows=[...quality.querySelectorAll<HTMLElement>('.platformSignalList > div, .platformSignalList > button')];
  for(const row of rows){
    row.classList.remove('inventorySignalBad','inventorySignalWarn','inventorySignalClear');
    const label=row.querySelector('span')?.textContent?.trim().toLowerCase()||'';
    if(row.classList.contains('clear')){
      row.classList.add('inventorySignalClear');
      continue;
    }
    if(label==='duplicate serial entries'){
      row.classList.add('inventorySignalBad');
      hasBad=true;
    }else{
      row.classList.add('inventorySignalWarn');
      hasWarn=true;
    }
  }

  quality.classList.add(hasBad?'quality-tone-bad':hasWarn?'quality-tone-warn':'quality-tone-good');
}

let queued=false;
function queuePolish(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{queued=false;applyInventoryActivityPolish()});
}

const observer=new MutationObserver(queuePolish);
observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
window.addEventListener('DOMContentLoaded',queuePolish);
queuePolish();
