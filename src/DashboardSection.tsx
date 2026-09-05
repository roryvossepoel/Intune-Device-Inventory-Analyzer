import type { ReactNode } from 'react';

type DashboardCategoryIcon='security'|'activity'|'fleet'|'users'|'lifecycle'|'management'|'updates';

export default function DashboardSection({icon,title,subtitle,children,className=''}:{icon:DashboardCategoryIcon;title:string;subtitle:string;children:ReactNode;className?:string}){return <section className={`dashboardCategory ${className}`}><header className="dashboardCategoryHead"><span className={`categoryIcon category-${icon}`}><CategoryIcon name={icon}/></span><div><span>{title}</span><p>{subtitle}</p></div></header><div className="dashboardCategoryContent">{children}</div></section>}

function CategoryIcon({name}:{name:DashboardCategoryIcon}){
  if(name==='security')return <svg viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 4.5 2.9 7.3 7 9 4.1-1.7 7-4.5 7-9V6l-7-3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>;
  if(name==='activity')return <svg viewBox="0 0 24 24"><path d="M4 18V6m0 12h16"/><path d="m7 14 3-3 3 2 4-5"/><circle cx="7" cy="14" r="1"/><circle cx="10" cy="11" r="1"/><circle cx="13" cy="13" r="1"/><circle cx="17" cy="8" r="1"/></svg>;
  if(name==='fleet')return <svg viewBox="0 0 24 24"><rect x="3" y="4" width="8" height="7" rx="1"/><rect x="13" y="4" width="8" height="7" rx="1"/><rect x="3" y="13" width="8" height="7" rx="1"/><rect x="13" y="13" width="8" height="7" rx="1"/></svg>;
  if(name==='users')return <svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3.5 19c.5-3.7 2.4-5.5 5.5-5.5s5 1.8 5.5 5.5M14.5 14.5c2.9 0 4.7 1.5 5.2 4.5"/></svg>;
  if(name==='lifecycle'||name==='updates')return <svg viewBox="0 0 24 24"><path d="M19 8a7 7 0 1 0 1 6"/><path d="M19 3v5h-5"/><path d="M12 8v4l3 2"/></svg>;
  return <svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3.5 19c.5-3.7 2.4-5.5 5.5-5.5s5 1.8 5.5 5.5M16 7h5m-2.5-2.5V9.5"/></svg>;
}
