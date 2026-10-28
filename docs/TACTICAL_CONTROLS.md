# Tactical controls update — 2026-10-28

- Next ready unit button and N key cycle only the player's unspent units, with camera focus. F refocuses; G rests.
- Roster lists own unit HP and action completion without exposing hidden opponents.
- Attack target buttons display authoritative damage, remaining HP and lethal outcomes; execution revalidates through existing rules.
- Player movement and attacks now use cosmetic playback, including damage labels. State saves before playback; inputs lock until completion. Reduced-motion preference skips playback. Empty animation phases no longer add delay.
- Ending a turn with unspent units offers return-to-unit or explicit end-turn choices.
- Existing combat balance, save schema and research rules are unchanged.

Verification: full npm test passed, including new three-school navigation, fog-safe previews, lethal damage and stale-action rejection tests. Browser checks: resumed the previous round-2 save, selected and focused units, inspected the turn-end dialog, executed a lethal attack from the target list, observed input locking and correct ready count after playback, and checked roster status. A 390×844 embedded viewport displayed both target buttons and bottom controls without overlap. Physical mobile FPS and a complete manual campaign remain unverified.
