import assert from 'node:assert/strict';
import {test} from 'node:test';
import {newGame,orderFor,resolve,movementRange,score,canHit,setRecruit,setResearch,FACTIONS,TROOPS,totalIncome} from './engine.mjs';

test('초기 21x21 / 3진영 / 6부대 / 7거점',()=>{
  const s=newGame();assert.equal(s.tiles.length,21);assert.equal(s.tiles[0].length,21);assert.equal(s.factions.length,3);assert.equal(s.units.length,6);assert.equal(s.hubs.length,7);assert.equal(s.factions[0].op,10);assert.equal(score(s,0),5);
});
test('한 턴 동시 실행, 수입, 기록 생성',()=>{
  const s=newGame();const r=resolve(s);assert.equal(r.ok,true);assert.equal(s.turn,2);assert.equal(s.factions[0].op,15);assert.equal(s.history[0].turn,1);assert.equal(s.phase,'planning');
});
test('이동 예약·불법 이동 거절·실행',()=>{
  const s=newGame();const u=s.units.find(x=>x.owner===0&&x.type==='infantry');const choice=movementRange(s,u)[0];assert.ok(choice);assert.equal(orderFor(s,0,u.id,{kind:'move',x:100,y:100}),false);assert.equal(orderFor(s,0,u.id,{kind:'move',x:choice.x,y:choice.y}),true);resolve(s);assert.deepEqual([u.x,u.y],[choice.x,choice.y]);
});
test('부대 두 명의 충돌은 모두 정지',()=>{
 const s=newGame();const a=s.units.find(u=>u.owner===0),b=s.units.find(u=>u.owner===1);s.units=s.units.filter(u=>u.id===a.id||u.id===b.id);a.x=9;a.y=9;b.x=11;b.y=9;s.tiles[9][10].kind='plain';
 assert.equal(orderFor(s,0,a.id,{kind:'move',x:10,y:9}),true);assert.equal(orderFor(s,1,b.id,{kind:'move',x:10,y:9}),true);resolve(s);assert.deepEqual([a.x,a.y],[9,9]);assert.deepEqual([b.x,b.y],[11,9]);
});
test('거점 점령은 다음 턴 수입에 적용',()=>{
 const s=newGame();const u=s.units.find(u=>u.owner===0);u.x=5;u.y=5;assert.equal(orderFor(s,0,u.id,{kind:'capture'}),true);resolve(s);assert.equal(s.hubs[0].owner,0);assert.equal(totalIncome(s,0),7);assert.equal(s.factions[0].op,17);
});
test('연구 투자·해금·연구 효과',()=>{
 const s=newGame();assert.equal(setResearch(s,0,'economy'),true);resolve(s);assert.equal(s.factions[0].progress.economy,3);resolve(s);assert.ok(s.factions[0].techs.includes('economy'));assert.equal(s.factions[0].research,null);
});
test('모집 예약과 비용',()=>{
 const s=newGame();assert.equal(setRecruit(s,0,'infantry'),true);resolve(s);assert.equal(s.factions[0].op,10);assert.equal(s.units.filter(u=>u.owner===0).length,3);
});
test('동일 시작 상태/명령이면 결정적인 결과',()=>{
 const s=newGame(),b=JSON.parse(JSON.stringify(s));for(let i=0;i<5;i++){resolve(s);resolve(b);}assert.deepEqual(s,b);
});
test('승리 점수로 15턴 끝남',()=>{
 const s=newGame();for(let i=0;i<15;i++)resolve(s);assert.equal(s.phase,'finished');assert.equal(s.turn,15);assert.equal(s.history.length,16);
});
test('상대 캠퍼스는 정해진 4접점에서만 공격',()=>{
 const s=newGame(),u=s.units.find(x=>x.owner===0);const f=s.factions[1];u.x=f.base[0]-1;u.y=f.base[1]+1;assert.equal(canHit(s,u,{kind:'base',owner:1}),true);u.x=f.base[0]-1;u.y=f.base[1];assert.equal(canHit(s,u,{kind:'base',owner:1}),false);
});
test('정찰대는 2칸 이동 후 다음 턴 거점을 점령할 수 있다',()=>{
 const s=newGame();const scout=s.units.find(u=>u.owner===0&&u.type==='scout');
 assert.equal(orderFor(s,0,scout.id,{kind:'move',x:5,y:5}),true);
 resolve(s);assert.deepEqual([scout.x,scout.y],[5,5]);
 assert.equal(orderFor(s,0,scout.id,{kind:'capture'}),true);
 resolve(s);assert.equal(s.hubs[0].owner,0);assert.equal(s.turn,3);
});
test('쌍방 공격 시 피해가 동시에 적용된다',()=>{
 const s=newGame(),a=s.units.find(u=>u.owner===0),b=s.units.find(u=>u.owner===1);
 s.units=[a,b];a.x=9;a.y=9;b.x=10;b.y=9;
 assert.equal(orderFor(s,0,a.id,{kind:'attack',target:{kind:'unit',id:b.id}}),true);
 assert.equal(orderFor(s,1,b.id,{kind:'attack',target:{kind:'unit',id:a.id}}),true);
 resolve(s);assert.ok(a.hp<10&&b.hp<10);
});
