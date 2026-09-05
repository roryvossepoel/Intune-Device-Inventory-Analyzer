export {};

function ensureHeaderGithub(){
  const actions=document.querySelector<HTMLElement>('.topbar .topActions');
  if(!actions||actions.querySelector('.githubHeaderButton'))return;
  const link=document.createElement('a');
  link.className='githubHeaderButton';
  link.href='https://github.com/roryvossepoel/Intune-Device-Inventory-Analyzer';
  link.target='_blank';
  link.rel='noreferrer';
  link.setAttribute('aria-label','View project on GitHub');
  link.title='View on GitHub';
  link.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 .9A11.1 11.1 0 0 0 8.5 22.5c.55.1.75-.24.75-.53v-2.05c-3.05.66-3.69-1.3-3.69-1.3-.5-1.27-1.22-1.61-1.22-1.61-.99-.68.08-.67.08-.67 1.1.08 1.68 1.13 1.68 1.13.98 1.67 2.56 1.19 3.19.91.1-.71.38-1.19.69-1.46-2.43-.28-4.99-1.22-4.99-5.43 0-1.2.43-2.18 1.13-2.95-.11-.28-.49-1.4.11-2.91 0 0 .92-.3 3.02 1.12A10.5 10.5 0 0 1 12 6.38c.94 0 1.88.13 2.75.37 2.1-1.42 3.02-1.12 3.02-1.12.6 1.51.22 2.63.11 2.91.7.77 1.13 1.75 1.13 2.95 0 4.22-2.57 5.15-5.01 5.42.39.34.74 1 .74 2.02v3c0 .29.2.64.76.53A11.1 11.1 0 0 0 12 .9Z"/></svg>';
  actions.append(link);
}

let queued=false;
function queueHeaderGithub(){
  if(queued)return;
  queued=true;
  requestAnimationFrame(()=>{queued=false;ensureHeaderGithub()});
}

const observer=new MutationObserver(queueHeaderGithub);
observer.observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener('DOMContentLoaded',queueHeaderGithub);
queueHeaderGithub();
