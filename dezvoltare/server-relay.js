'use strict';
/**
 * Kawaii Invaders — relay minimal pentru co-op online.
 * Nu simulează jocul; doar pune în legătură doi clienți cu același cod
 * de cameră și le retransmite mesajele unul către celălalt.
 *
 * Protocol (fixat de clientul din index.html, nu se schimbă aici):
 *   client -> server:  {type:'join', room:'ABC123'}
 *   client -> server:  {type:'msg',  data:{...}}          (payload arbitrar)
 *   server -> client:  {type:'peer'}                       (camera are 2 membri)
 *   server -> client:  {type:'left'}                       (celălalt s-a deconectat)
 *   server -> client:  {type:'msg',  data:{...}}            (retransmis de la celălalt)
 *   server -> client:  {type:'error',reason:'...'}          (bad_code|room_full|server_full|timeout)
 */
const http = require('http');
const { WebSocketServer } = require('ws');

const PORT           = process.env.PORT || 3000;
const MAX_ROOMS       = Number(process.env.MAX_ROOMS)       || 2000;
const IDLE_ROOM_MS    = Number(process.env.IDLE_ROOM_MS)    || 10 * 60 * 1000; // cameră cu un singur ocupant, prea mult timp
const HEARTBEAT_MS    = Number(process.env.HEARTBEAT_MS)    || 25 * 1000;
const REAP_TICK_MS    = Number(process.env.REAP_TICK_MS)    || 60 * 1000;
const ROOM_CODE_RE    = /^[A-Z0-9]{3,16}$/;

const rooms = new Map(); // code -> { slots:[ws|null, ws|null], lastActivity:number }

function log(...a){ console.log(new Date().toISOString(), ...a); }

function safeSend(ws, obj){
  if(ws && ws.readyState === ws.OPEN){
    try{ ws.send(JSON.stringify(obj)); }catch(e){ /* client tocmai a picat — ignorăm */ }
  }
}

function roomOf(ws){ return ws.__room ? rooms.get(ws.__room) : null; }

function leaveRoom(ws){
  const code = ws.__room;
  if(!code) return;
  const room = rooms.get(code);
  ws.__room = null;
  if(!room) return;
  const idx = room.slots.indexOf(ws);
  if(idx !== -1) room.slots[idx] = null;
  const other = room.slots.find(Boolean);
  if(other) safeSend(other, {type:'left'});
  if(!room.slots.some(Boolean)) rooms.delete(code);
  else room.lastActivity = Date.now();
}

function joinRoom(ws, rawCode){
  const code = String(rawCode || '').toUpperCase().trim();
  if(!ROOM_CODE_RE.test(code)){ safeSend(ws, {type:'error', reason:'bad_code'}); return; }
  if(ws.__room === code) return;         // deja aici, nu face nimic
  if(ws.__room) leaveRoom(ws);           // schimbă camera curat, dacă era în alta

  let room = rooms.get(code);
  if(!room){
    if(rooms.size >= MAX_ROOMS){ safeSend(ws, {type:'error', reason:'server_full'}); return; }
    room = { slots:[null,null], lastActivity: Date.now() };
    rooms.set(code, room);
  }
  const freeIdx = room.slots.indexOf(null);
  if(freeIdx === -1){ safeSend(ws, {type:'error', reason:'room_full'}); return; }

  room.slots[freeIdx] = ws;
  ws.__room = code;
  room.lastActivity = Date.now();

  if(room.slots[0] && room.slots[1]){
    log('paired', code);
    safeSend(room.slots[0], {type:'peer'});
    safeSend(room.slots[1], {type:'peer'});
  }
}

function relay(ws, data){
  const room = roomOf(ws);
  if(!room) return;
  const other = room.slots.find(s => s && s !== ws);
  if(other) safeSend(other, {type:'msg', data});
  room.lastActivity = Date.now();
}

const server = http.createServer((req, res)=>{
  res.writeHead(200, {'Content-Type':'text/plain'});
  res.end('kawaii-invaders relay ok\n');
});

const wss = new WebSocketServer({ server, maxPayload: 64 * 1024 });

wss.on('connection', (ws)=>{
  ws.isAlive = true;
  ws.on('pong', ()=>{ ws.isAlive = true; });

  ws.on('message', (raw)=>{
    let m;
    try{ m = JSON.parse(raw); }catch(e){ return; }        // mesaj stricat — ignorat, nu doboară serverul
    if(!m || typeof m.type !== 'string') return;
    if(m.type === 'join') joinRoom(ws, m.room);
    else if(m.type === 'msg') relay(ws, m.data);
  });

  ws.on('close', ()=>{ leaveRoom(ws); });
  ws.on('error', ()=>{ leaveRoom(ws); });
});

// ping periodic; oricine nu răspunde cu pong până la următorul tick e considerat picat
const hbTimer = setInterval(()=>{
  wss.clients.forEach((ws)=>{
    if(ws.isAlive === false){ leaveRoom(ws); return ws.terminate(); }
    ws.isAlive = false;
    try{ ws.ping(); }catch(e){}
  });
}, HEARTBEAT_MS);

// curăță camerele abandonate (un singur ocupant, prea mult timp fără al doilea)
const reapTimer = setInterval(()=>{
  const now = Date.now();
  for(const [code, room] of rooms){
    const bothEmpty = !room.slots[0] && !room.slots[1];
    const stale = now - room.lastActivity > IDLE_ROOM_MS;
    if(bothEmpty){ rooms.delete(code); continue; }
    if(stale){
      const alone = room.slots.find(Boolean);
      if(alone) safeSend(alone, {type:'error', reason:'timeout'});
      rooms.delete(code);
    }
  }
}, REAP_TICK_MS);

server.listen(PORT, ()=>log('relay listening on', PORT));

function shutdown(){ clearInterval(hbTimer); clearInterval(reapTimer); server.close(()=>process.exit(0)); }
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = { server, wss, rooms }; // pentru testare
