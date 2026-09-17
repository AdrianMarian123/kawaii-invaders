// Temele sezoniere ale meniului (vara / galactic), salvate in ki_menu_theme.

// ——— teme de meniu (sezoniere) ———
const MENU_THEMES=[{id:'summer',n:'🏖️ Vară'},{id:'space',n:'🌌 Galactic (clasic)'}];
let menuTheme='summer'; try{ const _mt=localStorage.getItem('ki_menu_theme'); if(_mt&&MENU_THEMES.some(x=>x.id===_mt))menuTheme=_mt; }catch(e){}
function applyMenuTheme(){ try{ document.body.classList.toggle('tsummer',menuTheme==='summer'); }catch(e){}
  try{ document.querySelectorAll('.topt').forEach(b=>b.classList.toggle('go',b.dataset.t===menuTheme)); }catch(e){} }
function setMenuTheme(id){ menuTheme=id; try{localStorage.setItem('ki_menu_theme',id);}catch(e){} applyMenuTheme(); }   // auto-quality: rolling frame-time monitor drops heavy FX on weak devices

export { applyMenuTheme, menuTheme, setMenuTheme };
