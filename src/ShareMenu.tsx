import { useEffect, useRef, useState } from 'react';

const SHARE_TITLE='Intune Device Inventory Analyzer';
const SHARE_TEXT='Turn a Microsoft Intune device inventory export into clear, local-first dashboards, device exploration and management-ready stories.';

function ShareIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/></svg>}
function LinkIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>}
function MailIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>}
function XIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true" className="fill"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.66-9.896L0 1.154h7.594l5.243 6.932L18.901 1.153Zm-1.292 19.492h2.039L6.486 3.24H4.298l13.311 17.405Z"/></svg>}
function BlueskyIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true" className="fill"><path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.815 2.736 3.713 3.66 6.383 3.364-4.56.672-5.544 2.89-3.115 5.108 4.572 4.16 6.63-.679 7.2-2.264.57 1.585 2.173 6.312 6.818 2.264 2.432-2.118 1.44-4.426-3.03-5.1 2.67.296 5.568-.628 6.383-3.364.246-.829.624-5.79.624-6.478 0-.69-.139-1.861-.902-2.206-.659-.298-1.665-.62-4.3 1.24C16.046 4.747 13.087 8.686 12 10.8Z"/></svg>}
function LinkedinIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true" className="fill"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM6.814 20.452H3.861V9h2.953v11.452z"/></svg>}
function CheckIcon(){return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>}

export default function ShareMenu(){
  const [open,setOpen]=useState(false);
  const [copied,setCopied]=useState(false);
  const root=useRef<HTMLDivElement>(null);
  const shareUrl=()=>window.location.href;

  useEffect(()=>{
    if(!open)return;
    const outside=(event:PointerEvent)=>{if(root.current&&!root.current.contains(event.target as Node))setOpen(false)};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)};
    document.addEventListener('pointerdown',outside);
    document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)};
  },[open]);

  async function copyLink(){
    const url=shareUrl();
    try{await navigator.clipboard.writeText(url)}catch{
      const input=document.createElement('textarea');input.value=url;input.setAttribute('readonly','');input.style.position='fixed';input.style.opacity='0';document.body.appendChild(input);input.select();document.execCommand('copy');input.remove();
    }
    setCopied(true);window.setTimeout(()=>setCopied(false),1600);
  }

  async function nativeShare(){
    try{await navigator.share({title:SHARE_TITLE,text:SHARE_TEXT,url:shareUrl()});setOpen(false)}catch(error){if(!(error instanceof DOMException&&error.name==='AbortError'))console.error(error)}
  }
  function popup(url:string){window.open(url,'_blank','noopener,noreferrer,width=760,height=640')}

  return <div className={`idaShare ${open?'open':''}`} ref={root}>
    <button type="button" className="idaShareToggle" onClick={()=>setOpen(value=>!value)} aria-haspopup="menu" aria-expanded={open}><ShareIcon/><span>Share</span></button>
    {open&&<div className="idaShareMenu" role="menu" aria-label="Share Intune Device Inventory Analyzer">
      <div className="idaShareHeading"><strong>Share Intune Inventory</strong><span>Share this analyzer with someone else.</span></div>
      <button type="button" role="menuitem" className={copied?'copied':''} onClick={()=>void copyLink()}><span className="idaShareIcon">{copied?<CheckIcon/>:<LinkIcon/>}</span><strong>{copied?'Copied link':'Copy link'}</strong></button>
      {typeof navigator.share==='function'&&<button type="button" role="menuitem" onClick={()=>void nativeShare()}><span className="idaShareIcon"><ShareIcon/></span><strong>Share…</strong></button>}
      <div className="idaShareDivider"/>
      <button type="button" role="menuitem" onClick={()=>popup(`https://x.com/intent/post?text=${encodeURIComponent(`${SHARE_TEXT} ${shareUrl()}`)}`)}><span className="idaShareIcon"><XIcon/></span><strong>X</strong></button>
      <button type="button" role="menuitem" onClick={()=>popup(`https://bsky.app/intent/compose?text=${encodeURIComponent(`${SHARE_TEXT}\n${shareUrl()}`)}`)}><span className="idaShareIcon"><BlueskyIcon/></span><strong>Bluesky</strong></button>
      <button type="button" role="menuitem" onClick={()=>popup(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl())}`)}><span className="idaShareIcon"><LinkedinIcon/></span><strong>LinkedIn</strong></button>
      <button type="button" role="menuitem" onClick={()=>{window.location.href=`mailto:?subject=${encodeURIComponent(SHARE_TITLE)}&body=${encodeURIComponent(`${SHARE_TEXT}\n\n${shareUrl()}`)}`}}><span className="idaShareIcon"><MailIcon/></span><strong>Email</strong></button>
    </div>}
  </div>;
}
