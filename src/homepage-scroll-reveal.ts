const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');

const revealSelector=[
  '.idaHomeIntro',
  '.idaCapability',
  '.idaRealExamplesCopy',
  '.idaExampleStack article',
  '.idaWorkflow header',
  '.idaWorkflow > div',
  '.idaReportsTeaserCopy',
  '.idaReportDoc',
  '.idaTrustLead',
  '.idaTrustPanel > article'
].join(',');

let observer:IntersectionObserver|null=null;

function ensureObserver(){
  if(observer||reducedMotion.matches||!('IntersectionObserver' in window))return;
  observer=new IntersectionObserver(entries=>{
    for(const entry of entries){
      if(!entry.isIntersecting)continue;
      const element=entry.target as HTMLElement;
      element.classList.add('idaRevealVisible');
      observer?.unobserve(element);
    }
  },{
    threshold:.12,
    rootMargin:'0px 0px -8% 0px'
  });
}

function prepareRevealElements(root:ParentNode=document){
  const elements=root.querySelectorAll<HTMLElement>(revealSelector);
  if(reducedMotion.matches||!('IntersectionObserver' in window)){
    elements.forEach(element=>element.classList.add('idaRevealVisible'));
    return;
  }

  ensureObserver();
  elements.forEach(element=>{
    if(element.dataset.idaRevealBound==='true')return;
    element.dataset.idaRevealBound='true';
    element.classList.add('idaReveal');
    observer?.observe(element);
  });
}

function refresh(){
  const home=document.querySelector('.idaHome');
  if(home)prepareRevealElements(home);
}

requestAnimationFrame(refresh);

const appRoot=document.getElementById('root');
if(appRoot){
  new MutationObserver(refresh).observe(appRoot,{childList:true,subtree:true});
}

reducedMotion.addEventListener('change',()=>{
  if(reducedMotion.matches){
    observer?.disconnect();
    observer=null;
    document.querySelectorAll<HTMLElement>('.idaReveal').forEach(element=>element.classList.add('idaRevealVisible'));
  }else{
    refresh();
  }
});
