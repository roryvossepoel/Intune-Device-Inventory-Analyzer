export {};

/* The product logo is the global Home affordance. Reloading intentionally
   returns to the public landing page and clears the in-memory inventory. */
document.addEventListener('click',(event)=>{
  const target=event.target;
  if(!(target instanceof Element))return;
  const brand=target.closest('.brand');
  if(!brand)return;
  event.preventDefault();
  event.stopPropagation();
  window.location.assign('/');
},true);
