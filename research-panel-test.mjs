import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSequentialGame,applySequentialAction,cityIncome,technologyCost,BRANCHES} from './sequential-mode.js';
import {researchCatalog,researchDetail} from './research-panel.js';
import {visibleTiles} from './vision.js';

for(const team of ['ally','enemy','rival']){
 const s=createSequentialGame({playerTeam:team,seed:17});
 const catalog=researchCatalog(s,team);
 assert.equal(catalog.length,4);
 assert.deepEqual(catalog.map(x=>x.branch),Object.keys(BRANCHES));
 for(const row of catalog){
  assert.equal(row.nodes.length,3);
  assert.deepEqual(row.nodes.map(n=>n.status),['available','locked','locked']);
  assert.deepEqual(row.nodes.map(n=>n.name),BRANCHES[row.branch].steps);
  assert.equal(row.nodes[0].cost,technologyCost(s,team,row.branch));
  for(const node of row.nodes){
   assert.ok(node.summary.length>10);
   assert.equal(node.effects.length,2,'detail contains only two grounded effects');
   assert.ok(!node.effects.some(e=>/자원 타일 개발 가능|다른 건물 해금/.test(e)),'do not invent effects');
  }
 }
}
{
 const s=createSequentialGame({playerTeam:'enemy'});
 s.enemyGold=0;
 const n=researchDetail(s,'enemy','economy',1);
 assert.equal(n.status,'insufficient');
 assert.equal(n.canPurchase,false);
}
{
 let s=createSequentialGame({playerTeam:'ally'});
 s.gold=90;
 const income=cityIncome(s,'ally');
 const before=researchDetail(s,'ally','economy',1);
 assert.equal(before.cost,technologyCost(s,'ally','economy'));
 const act=applySequentialAction(s,{type:'research',branch:'economy'});
 assert.ok(!act.error);
 s=act.state;
 assert.equal(cityIncome(s,'ally'),income+2,'economy effect shows real extra OP per round');
 assert.equal(researchDetail(s,'ally','economy',1).status,'complete');
 assert.equal(researchDetail(s,'ally','economy',2).status,'available');
 assert.equal(researchDetail(s,'ally','economy',3).status,'locked');
}
{
 let s=createSequentialGame({playerTeam:'ally'});s.gold=99;
 const before=technologyCost(s,'ally','military');
 s=applySequentialAction(s,{type:'research',branch:'science'}).state;
 const after=technologyCost(s,'ally','military');
 assert.equal(after,Math.max(3,before-1),'science discount must be actual, subject to minimum 3');
 s=applySequentialAction(s,{type:'research',branch:'science'}).state;
 const n=researchDetail(s,'ally','science',2);
 assert.equal(n.status,'complete');
 assert.ok(n.effects.some(e=>e.includes('시야')));
 const without=structuredClone(s);without.technologies.ally.science=1;
 const unit=s.units.find(u=>u.team==='ally');unit.x=9;unit.z=10;
 without.units.find(u=>u.id===unit.id).x=9;without.units.find(u=>u.id===unit.id).z=10;
 assert.ok(visibleTiles(s,'ally').size>visibleTiles(without,'ally').size,'science tier 2 reveals farther cells');
}
{
 let s=createSequentialGame({playerTeam:'enemy'});s.enemyGold=100;
 for(let i=0;i<2;i++)s=applySequentialAction(s,{type:'research',branch:'military'}).state;
 assert.ok(!applySequentialAction(s,{type:'recruit',kind:'cavalry'}).error,'military tier 2 unlocks cavalry');
 s=applySequentialAction(s,{type:'research',branch:'military'}).state;
 assert.ok(!applySequentialAction(s,{type:'recruit',kind:'siege'}).error,'tier 3 unlocks siege');
 assert.ok(researchDetail(s,'enemy','military',3).effects.some(e=>e.includes('공성대')));
}
{
 const app=readFileSync('sequential-app.js','utf8'),html=readFileSync('index.html','utf8');
 const css=readFileSync('research-v5.css','utf8'),main=readFileSync('arena-app.js','utf8');
 assert.ok(app.includes("createResearchPanel("));
 assert.ok(app.includes('id="seqTechDetail"'));
 assert.ok(app.includes('id="seqTechOptions"'));
 assert.ok(app.includes('seqResearchTitle'));
 assert.ok(app.includes("research-panel.js?v=5"));
 assert.ok(html.includes('research-v5.css?v=5'));
 assert.ok(main.includes("sequential-app.js?v=42"));
 assert.ok(css.includes('@media(max-width:440px)'));
 assert.ok(css.includes('.seq-research-benefits')&&css.includes('.seq-research-illustration'));
}
console.log('PASS: 12 research nodes, accurate economy/science/military effect descriptions, visual details, responsive UI, and direct purchase wiring');
