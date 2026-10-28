export const RECRUITS={
 infantry:{name:'보병',cost:5,tier:0,role:'전선 유지 · 기동대에 피해 +2'},
 scout:{name:'정찰대',cost:4,tier:0,role:'빠른 탐험 · 공성대에 피해 +2'},
 cavalry:{name:'기동대',cost:9,tier:2,role:'빠른 기동 · 정찰대에 피해 +2'},
 siege:{name:'공성대',cost:10,tier:3,role:'2칸 원거리 · 본진에 피해 +3'}
};
export function matchupBonus(attacker,target){
 if(target.kind==='base')return attacker.kind==='siege'?3:0;
 return ({infantry:'cavalry',scout:'siege',cavalry:'scout'})[attacker.kind]===target.kind?2:0;
}
