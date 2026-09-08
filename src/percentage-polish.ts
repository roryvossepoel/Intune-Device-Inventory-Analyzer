export {};

/* Keep one decimal only when it adds information: 82.1% stays 82.1%,
   while 100.0%, 90.0% and 0.0% become 100%, 90% and 0%.
   The dashboard contains several independently rendered components, so this
   presentation-only pass keeps their visible percentage formatting consistent. */
const wholePercentage=/\b(-?\d+)\.0%/g;

function polishTextNode(node:Text){
  const value=node.nodeValue;
  if(!value||!value.includes('.0%'))return;
  const next=value.replace(wholePercentage,'$1%');
  if(next!==value)node.nodeValue=next;
}

function polishDashboard(root:Element){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  let node=walker.nextNode();
  while(node){polishTextNode(node as Text);node=walker.nextNode()}
}

function scan(){
  document.querySelectorAll<HTMLElement>('.inventoryDashboard').forEach(polishDashboard);
}

let scheduled=false;
function schedule(){
  if(scheduled)return;
  scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;scan()});
}

const observer=new MutationObserver(schedule);
observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
queueMicrotask(scan);
