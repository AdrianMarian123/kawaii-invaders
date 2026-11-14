// Temele sezoniere ale meniului (halloween / vara / galactic), salvate in ki_menu_theme.

// ——— teme de meniu (sezoniere) ———
const MENU_THEMES=[{id:'halloween',n:'🎃 Halloween'},{id:'summer',n:'🏖️ Vară'},{id:'space',n:'🌌 Galactic (clasic)'}];
// tema sezonului: o primește oricine nu și-a ales singur alta
let menuTheme='halloween'; try{ const _mt=localStorage.getItem('ki_menu_theme'); if(_mt&&MENU_THEMES.some(x=>x.id===_mt))menuTheme=_mt; }catch(e){}
// emoji-urile care plutesc prin meniu, pe temă (fără intrare = cele din index.html)
const MENU_PARTICLES={halloween:['🎃','👻','🦇','🍬','🕸️','🍭','💀','✨']};
function applyMenuTheme(){ try{ document.body.classList.toggle('tsummer',menuTheme==='summer'); document.body.classList.toggle('thalloween',menuTheme==='halloween'); }catch(e){}
  try{ const mp=document.querySelector('#menu .mparticles'); if(mp){ if(mp.dataset.def==null)mp.dataset.def=mp.innerHTML;
    const em=MENU_PARTICLES[menuTheme]; mp.innerHTML=em?em.map(x=>'<i>'+x+'</i>').join(''):mp.dataset.def; } }catch(e){}
  try{ document.querySelectorAll('.topt').forEach(b=>b.classList.toggle('go',b.dataset.t===menuTheme)); }catch(e){} }
function setMenuTheme(id){ menuTheme=id; try{localStorage.setItem('ki_menu_theme',id);}catch(e){} applyMenuTheme(); }   // auto-quality: rolling frame-time monitor drops heavy FX on weak devices

export { applyMenuTheme, menuTheme, setMenuTheme };
