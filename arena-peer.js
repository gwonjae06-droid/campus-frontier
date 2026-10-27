// Optional, direct peer-to-peer friendly games: no registration, central server,
// matchmaking or verified ranking. SDP codes must be exchanged out of band.
export function createDuelPeer(onEvent=()=>{}){
 if(typeof RTCPeerConnection==='undefined')throw Error('이 브라우저는 WebRTC 연결을 지원하지 않습니다.');
 const pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
 let channel=null,closed=false;
 const emit=(type,data)=>onEvent({type,data});
 const watch=ch=>{
  channel=ch;
  ch.onopen=()=>emit('open');
  ch.onclose=()=>emit('close');
  ch.onerror=()=>emit('error','데이터 채널 오류');
  ch.onmessage=e=>{try{
   const payload=JSON.parse(e.data);
   if(payload&&typeof payload.type==='string'&&JSON.stringify(payload).length<20000)emit('message',payload);
  }catch{}};
 };
 pc.ondatachannel=e=>watch(e.channel);
 pc.onconnectionstatechange=()=>{if(['failed','disconnected','closed'].includes(pc.connectionState))emit('status',pc.connectionState);};
 const waitIce=()=>new Promise(resolve=>{
  if(pc.iceGatheringState==='complete')return resolve();
  const finish=()=>{clearTimeout(timer);pc.removeEventListener('icegatheringstatechange',check);resolve();};
  const check=()=>{if(pc.iceGatheringState==='complete')finish();};
  const timer=setTimeout(finish,8500);
  pc.addEventListener('icegatheringstatechange',check);
 });
 function validate(text,kind){
  const raw=text.trim();
  if(raw.length>25000||raw.length<20)throw Error('연결 코드의 형식을 확인하세요.');
  let obj;
  try{obj=JSON.parse(raw);}catch{throw Error('연결 코드는 JSON 텍스트입니다. 코드를 전부 복사해 주세요.');}
  if(obj.type!==kind||typeof obj.sdp!=='string'||obj.sdp.length<40)throw Error('올바른 연결 코드가 아닙니다.');
  return {type:obj.type,sdp:obj.sdp};
 }
 return {
  async offer(){
   watch(pc.createDataChannel('campus-duel',{ordered:true}));
   await pc.setLocalDescription(await pc.createOffer());
   await waitIce();
   return JSON.stringify({type:pc.localDescription.type,sdp:pc.localDescription.sdp});
  },
  async answer(code){
   await pc.setRemoteDescription(validate(code,'offer'));
   await pc.setLocalDescription(await pc.createAnswer());
   await waitIce();
   return JSON.stringify({type:pc.localDescription.type,sdp:pc.localDescription.sdp});
  },
  async accept(code){await pc.setRemoteDescription(validate(code,'answer'));},
  send(data){
   if(channel?.readyState!=='open')return false;
   const text=JSON.stringify(data);
   if(text.length>20000)return false;
   channel.send(text);return true;
  },
  connected:()=>channel?.readyState==='open',
  close(){if(closed)return;closed=true;channel?.close();pc.close();}
 };
}
