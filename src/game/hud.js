// HUD-ul din timpul jocului: scor, sector/val, combo, inimioarele
// (doua randuri in co-op), contoarele de rachete si burst.
import { el, ui } from './utils.js';
import { mult, net, p2, player, score, sectorIndex, wave } from './sim.js';

// Scorul „al meu": partea navei mele în co-op, totalul când joc singur.
function myScore(){ return (net.mode!=='off'&&p2.active)?(player.score|0):(score|0); }
function updateHUD(){
  // În co-op fiecare își vede scorul LUI; singur, e același lucru cu totalul.
  ui.score.textContent=(myScore()).toLocaleString();
  ui.sector.textContent='SECTOR '+(sectorIndex()+1)+' · VAL '+wave;
  if(mult>1){ui.combo.textContent='x'+mult;ui.combo.style.opacity='1';ui.combo.style.transform='scale(1.1)';}
  else{ui.combo.style.opacity='0';ui.combo.style.transform='scale(1)';}
  let h=''; for(let i=0;i<Math.max(0,player.lives);i++)h+='💗'; ui.lives.innerHTML=h||'—';
  if(player.dead)ui.lives.innerHTML='💀';
  // al doilea rând de inimioare — apare doar în co-op. Roz = tu, albastru = prietenul.
  { const row=el('p2Row'), on=(net.mode!=='off'&&p2.active);
    if(row){ row.style.display=on?'block':'none';
      const l1=el('livesLbl'); if(l1)l1.textContent=on?'tu':'vieți';
      if(on){ const v2=el('livesV2');
        if(v2){ let h2=''; for(let i=0;i<Math.max(0,p2.lives|0);i++)h2+='💙';
          v2.innerHTML=p2.dead?'💀':(h2||'—'); v2.style.opacity=p2.dead?'0.45':'1'; } } } }
  ui.missC.textContent=player.missiles; ui.burstC.textContent=player.burst;
// (lista de arme scoasă — nivelul se vede acum direct în tragere)
}

export { myScore, updateHUD };
