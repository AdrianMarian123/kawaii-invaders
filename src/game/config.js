// Tabelele lumii: sectoare, arme, creaturi, bosi, povestea.
// Doar date constante — fara stare de joc.

//==================================================================
// WORLD CONFIG
//==================================================================
const SECTORS=[
  {name:'NEBULOASA DE VATĂ',  sky:['#3a1860','#1a0a36'], neb:'#ff6bd6', accent:'#ff8fc7', animal:'bird',     event:'spring'},
  {name:'CUIBUL DRAGONILOR',   sky:['#10463a','#06201a'], neb:'#46e0a0', accent:'#7ef9d2', animal:'dragon',    event:'summer'},
  {name:'DEȘERTUL BISCUIT',   sky:['#4a2e16','#1e1208'], neb:'#ffae3b', accent:'#ffd24a', animal:'star',    event:'autumn'},
  {name:'INVAZIA FRUNZELOR',  sky:['#3a2410','#180e06'], neb:'#e0742a', accent:'#ffb15c', animal:'shroom',    event:'leaves'},
  {name:'DRAGOSTE STELARĂ',   sky:['#4a1430','#22081a'], neb:'#ff6b9d', accent:'#ff9ec4', animal:'nimbus',  event:'valentine'},
  {name:'PĂDUREA DE BAMBUS',  sky:['#173a2e','#08201a'], neb:'#9be8b0', accent:'#bfeccf', animal:'panda',   event:'normal'},
  {name:'CÂMPIA HAMSTERILOR',   sky:['#2e3a1e','#141a0c'], neb:'#b7c46b', accent:'#d8e07a', animal:'hamster',     event:'military'},
  {name:'NOAPTEA BÂNTUITĂ',   sky:['#3a2412','#180c08'], neb:'#ff8a3b', accent:'#ffb15c', animal:'ghost',   event:'halloween'},
  {name:'24 IANUARIE — UNIREA',sky:['#2a2a4a','#10101e'],neb:'#ffd24a', accent:'#ffe46b', animal:'bear',    event:'unire'},
  {name:'CRĂCIUN FERICIT',    sky:['#13314f','#08182e'], neb:'#bfeaff', accent:'#9fd6ff', animal:'snowman', event:'christmas'},
  {name:'HAITA IERNII',       sky:['#1a2740','#080f1e'], neb:'#aebfe0', accent:'#cdd8f0', animal:'wolf',    event:'winter'},
  {name:'POIANA MĂRȚIȘOR',    sky:['#2a4030','#0e1c14'], neb:'#ff8fae', accent:'#ffd6e0', animal:'lynx',    event:'martisor'},
  {name:'POIANA CIUPERCILOR',    sky:['#3a2c14','#16100a'], neb:'#ffb15c', accent:'#ffd24a', animal:'shroom',    event:'autumn'},
  {name:'BANCHIZA ALBASTRĂ',  sky:['#103a52','#06202e'], neb:'#bfeaff', accent:'#9fd6ff', animal:'penguin', event:'winter'},
];
const EVENT_NAME={spring:'PRIMĂVARĂ 🌸',summer:'VARĂ ☀️',autumn:'TOAMNĂ 🍂',leaves:'INVAZIA FRUNZELOR 🍂',winter:'IARNĂ ❄️',halloween:'HALLOWEEN 🎃',christmas:'CRĂCIUN 🎄',romania:'ROMÂNIA 🇷🇴',unire:'24 IANUARIE 🇷🇴',valentine:'VALENTINE 💕',military:'ZIUA INDEPENDENȚEI 🎖️',martisor:'MĂRȚIȘOR 🌸',normal:''};
const WEAPONS={
  pulse:    {name:'puls',   color:'#ff8fc7', icon:'✦'},
  scatter:  {name:'scatter',color:'#ffe46b', icon:'❀'},
  laser:    {name:'laser',  color:'#8fd3ff', icon:'≡'},
  arc:      {name:'arc',    color:'#c89bff', icon:'⚡'},
  boomer:   {name:'bumerang',color:'#ffce6a', icon:'🪃'},
  plasma:   {name:'plasmă', color:'#b07bff', icon:'🔮'},
  storm:    {name:'furtună',color:'#7fe1ff', icon:'🌩'},
  wave:     {name:'neutron',color:'#9affc0', icon:'🌈'},
  vulcan:   {name:'vulcan',  color:'#7dff9a', icon:'🌿'},
  rifle:    {name:'plasmă+', color:'#c07bff', icon:'🔮'},
};
const WEAPON_KEYS=['pulse','scatter','laser','arc','boomer','plasma','storm','wave','vulcan','rifle'];
const CRITTERS=['bird','dragon','star','nimbus','panda','hamster','penguin','ghost','bear','snowman','wolf','lynx','shroom'];
const CRITCOL={bird:'#5fb6e0', dragon:'#8fc063', star:'#ffd06b', nimbus:'#b9c8ef', panda:'#eef0f6', hamster:'#a05000', penguin:'#9fb0cc', ghost:'#e6e8ff', bear:'#c89368', snowman:'#f0f6ff', wolf:'#aeb6c6', lynx:'#d8b487', shroom:'#e05252'};
const BOSS_NAME={bird:'REGINA CERULUI',dragon:'DRAGONUL DE JAD',star:'ÎMPĂRATUL PUFULEȚ',nimbus:'DUCESA PISICILOR',panda:'MAESTRUL BAMBUS',hamster:'BARONUL RONȚĂILĂ',penguin:'ȚARUL GHEȚII',ghost:'STAFIA ZAHĂR',bear:'URSUL CARPATIN',snowman:'MOȘ OM-DE-ZĂPADĂ',wolf:'LUPUL ALFA',lynx:'RÂSUL UMBREI',shroom:'REGELE CIUPERCILOR'};
const WEAK={bird:'scatter',star:'scatter',snowman:'scatter',dragon:'arc',penguin:'arc',wolf:'arc',panda:'laser',ghost:'laser',shroom:'laser',nimbus:'pulse',hamster:'pulse',bear:'pulse',lynx:'pulse'};
const BEAST=[
  {key:'bird',name:'Păsărele Albastre',lore:'Ciripesc vesel și plonjează în stoluri jucăușe.'},
  {key:'dragon',name:'Dragonași de Jad',lore:'Mici, dar cu foc în piept și aripi neobosite.'},
  {key:'star',name:'Hamsteri-Stea',lore:'Mici și iuți, cu obrajii plini de provizii de zahăr.'},
  {key:'nimbus',name:'Pisicuțe-Nor',lore:'Grațioase și capricioase, plutesc pe nori moi.'},
  {key:'panda',name:'Panda de Bambus',lore:'Lenți, dar blindați cu o armură groasă de bambus.'},
  {key:'hamster',name:'Hamsteri Zburători',lore:'Cu obrajii plini de semințe și aripi mititele.'},
  {key:'penguin',name:'Pinguini de Gheață',lore:'Mărșăluiesc în colonii strânse pe banchiză.'},
  {key:'ghost',name:'Stafii de Zahăr',lore:'Plutesc, se feresc și trec prin orice.'},
  {key:'bear',name:'Urși Carpatini',lore:'Masivi și rezistenți, păzitorii plaiurilor.'},
  {key:'snowman',name:'Oameni de Zăpadă',lore:'Veseli, dar se sfărâmă într-o ploaie de fulgi.'},
  {key:'wolf',name:'Haita Iernii',lore:'Lupi iuți care vânează în haită strânsă.'},
  {key:'lynx',name:'Râși de Umbră',lore:'Feline-fantomă, rapide și tăcute.'},
  {key:'shroom',name:'Ciupercuțe Săltărețe',lore:'Răsar de nicăieri și țopăie prin poiană.'},
];
const XCOLS=['#e3433a','#ffd24a','#3fa15a','#3f7fd1','#c45ad1','#ff8fc7','#e8eef5'];
const LCOLS=['#e0742a','#d6452a','#e8b53a','#b5642a','#caa23a'];
const STORY=[
  "Demult, galaxia era plină de stele dulci...",
  "Apoi a venit ROIUL DE ZAHĂR — creaturi pufoase, adorabile și absolut nesătule.",
  "Au înghițit stea după stea, sector după sector.",
  "Acum doar tu mai zbori: pilotul navei Mochi-1.",
  "Recuperează stelele. Topește Roiul. Salvează galaxia pufoasă. 🌟",
];


export { BEAST, BOSS_NAME, CRITCOL, CRITTERS, EVENT_NAME, LCOLS, SECTORS, STORY, WEAK, WEAPONS, XCOLS };
