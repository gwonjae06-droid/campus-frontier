# School-specific unit models (2026-10-28)

Base: e3824ec54927f37df82165722016079cd5495caf (main).

| School | Infantry | Scout | Cavalry | Siege |
|---|---|---|---|---|
| SKKU | Scholar hat, long robe, rectangular shield | Light robe, map tube, staff | Ivory horse armor, scholar rider, banner | Counterweight catapult |
| Korea | Broad shoulders, axe, heavy shield | Twin blades, compact armor | Armored charger, heavy rider | Roofed battering ram |
| Yonsei | Triangular shield, narrow blade | Short cloak, light crossbow | Silver horse armor, swept tail | Wide crossbow ballista |

Models retain fixed team IDs (ally/enemy/rival) regardless of player choice. No combat statistics, rules, saved fields, research UI, or external assets changed. Import versions advance together to avoid stale browser modules.

## Performance

Cached geometry templates (maximum 12), cloned for each live instance so existing disposal remains valid. Parts merge by color; board materials stay shared. No textures, new frame animation, or new dependencies.

For one of each model, excluding unchanged badges and shadows:
- Before: 129 draw calls / 4,582 triangles.
- After: 57 draw calls / 2,348 triangles.
- Per model: at most 5 calls and 272 triangles.
- Physical mobile FPS / thermal behavior remains unmeasured; these are geometry budgets, not device benchmarks.

## Verification

- QA-01: Full `npm test` passed, including combat, deterministic saves, sequential turns, research, mobile gesture math and responsive layout checks.
- QA-02: All 12 geometry fingerprints differ without material colors. Tile footprint, grounding, badge clearance, finite vertices and raycast selection passed.
- QA-03: Model construction leaves frozen unit data unchanged; materials remain shared and instance geometry can be disposed independently.
- QA-04: Local browser gallery rendered all 12 variants; checked school outfits, mounts and three distinct siege silhouettes. Gallery offers front and grayscale views for repeat inspection.
- QA-05: Local game: entered as SKKU, purchased economy research (OP 10 to 7), selected and moved infantry, ended turn, observed Korea then Yonsei and round 2 (OP 14). No captured browser console errors.
- Remaining scope: no physical mobile device benchmark or full 30-round manual playthrough. Automated 30-turn simulation passed.

Open `docs/unit-gallery.html` through the local server or GitHub Pages to inspect models.
