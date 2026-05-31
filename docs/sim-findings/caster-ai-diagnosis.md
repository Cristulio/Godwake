# Caster AI diagnosis — is the wizard weak, or does the bot play it badly?

> Lane `feat/sim-caster-ai`. REPORT + bot-policy fix only. **No game mechanic,
> spell number, class stat, AC/HP formula, or balance value was changed** — only
> how the shared bot CHOOSES among existing actions. The same policy drives the
> in-game Auto-Battle, so this is also a better auto-player.

## The signal we set out to explain

- **Loot-blind** (`sim-class-viability`): wizard was the SHALLOWEST class — it
  dies early.
- **Gear-modelled** (`sim-endgame-gear`): wizard goes DEEPEST but has the LOWEST
  clear rate (clears the journey, can't close fights).

"Goes deep but never finishes" is the fingerprint of a bot that survives but never
assembles burst to kill. **Confirmed** — see below.

## Root causes found (all bot-decision, not class-power)

1. **A lone boss never got nuked.** The policy only cast Fireball/Lightning at
   **3+ enemies**. Against a single boss (the whole back half of the run) the
   wizard plinked with Fire Bolt while its 3rd-level slot sat unused — the top
   slot was wasted exactly when it mattered. This is the core "deep but never
   finishes" gap.
2. **The bot never learned Scorching Ray.** The headless level-up picker
   (`SIM_SPELL_PRIORITY`) took **Misty Step** at L3 — a one-turn +2 AC panic that
   does nothing in a no-positioning engine — over Scorching Ray, the
   single-target burst. The wizard's best L2 closer was never in its book.
3. **Shield could not fire.** The Shield reaction (`tryShieldReaction`, already
   wired in `monsterAttack`) needs a spare 1st-level slot, but the policy burned
   every L1 slot on Magic Missile offense, so the reaction starved.
4. **Control was crowd-only.** Hold Person was gated to 2+ enemies, so it never
   locked a lone boss (denying its whole turn while the wizard set up the kill).

### Already handled by the engine (no policy change needed — verified)

- **Mage Armor** is a passive class baseline: `createCombat` sets
  `mageArmorActive: true` every combat (+3 AC), so the wizard is never naked.
- **Shield** auto-fires as a reaction when +5 AC would turn a hit into a miss
  (`tryShieldReaction`). The only fix needed was leaving it a slot (root cause 3).
- **Concentration:** there is NO concentration model in the engine — Blur,
  Mirror Image, and Hold Person are independent buffs/debuffs. "Don't drop
  concentration carelessly" is therefore not applicable.

## What changed (selection only)

- `actionPolicy.ts` / `chooseWizardAction`:
  - **Assemble burst to CLOSE:** a single beefy target (HP ≥ `BOSS_NUKE_HP`) now
    eats Fireball/Lightning single-target, then Scorching Ray, before falling to
    cantrips.
  - **Reserve a 1st-level slot for Shield** before spending L1 slots on
    discretionary Magic Missile (the guaranteed kill at ≤6 HP still spends freely).
  - **Control a lone boss:** Hold Person now also locks a single high-threat foe,
    not just a crowd.
  - **Defensive smear when hurt:** Blur (or Mirror Image) at ≤50% HP if nothing
    already shields the wizard.
- `leveling.ts` / `SIM_SPELL_PRIORITY`: the bot now learns **Scorching Ray** at
  L3 (burst) instead of Misty Step; Blur/Mirror Image rank above Misty Step too.
  Changes only WHICH existing spell the bot picks — zero spell/class numbers — and
  only affects headless/sim callers (the in-game player still picks manually).

## Before / after (40 souls × 120 lives per class, same seeds)

### Loot-blind (`sim-class-viability`)

| metric | before | after |
|---|---:|---:|
| wizard avg depth (rooms) | 20.1 (**shallowest**) | 23.9 (mid-pack) |
| wizard avg final level | 4.37 | 4.89 |
| wizard clear% | 0.0% | 0.0% (no-loot floor — *no* class clears here) |

Other four classes: **identical to the decimal** before/after (fighter 22.7,
rogue 21.4, barbarian 24.0, ranger 37.5 depth) — the policy change is wizard-only.
The wizard goes from worst to mid-pack: closing fights faster means fewer return
hits, fewer early deaths, deeper routes, more levels.

### Gear-modelled (`sim-endgame-gear`) — the headline

| metric | before | policy only | policy + learn-priority |
|---|---:|---:|---:|
| wizard A0 clear% | 50.0% | 80.0% | **87.5%** |
| wizard first A0-clear (life) | 97.3 | 84.2 | **82.5** |
| wizard avg depth (rooms) | 48.3 | 50.1 | **51.0** (deepest) |
| wizard mean ascension cleared | <1 | — | **0.97** |
| wizard topped A6 | 0.0% | 0.0% | **0.0%** |

Martials unchanged: all four stay 100% A0 clear, 100% topped A6, mean ascension
**6.00**, first clear life 11–22. The policy bigger lever (50→80%); learning
Scorching Ray adds the rest (80→87.5%).

## Verdict

**The bot WAS playing the wizard badly, and fixing it closes most of the gap — but
not all of it.**

- **Early game / base run: the kit is fine.** Competent play turned the wizard
  from the shallowest loot-blind class into mid-pack, and lifted base-chain (A0)
  clear from 50% to **87.5%**. The "deep but never finishes" pathology was a
  passive bot, not a weak class.
- **Where it STILL lags: ascension scaling.** Even played well, the wizard's mean
  ascension cleared is **0.97 vs 6.00** for every martial, and it **never tops
  A6** (0%). It clears the base chain late (~life 82 vs 11–22) and then stalls at
  A1 — it cannot keep closing fights once monster HP/damage scale up across the
  back half. This is now a genuine **class-power-at-scaled-difficulty** signal, no
  longer an AI-floor artifact: the bot is using Fireball, Scorching Ray, Hold
  Person, and Shield, and still can't climb the ladder.

**Lever for a future buff (the user's separate call, NOT done here):** the wizard
needs more *sustained* closing power / survivability at higher ascension —
candidates a balance pass could weigh include more/higher spell slots at depth,
a scaling cantrip, or back-half-survivability. The early game does not need help.

### Caveats / things to watch

- **Hold Person on bosses** is now allowed. The engine applies `paralyzed` to any
  monster on a failed WIS save (no RAW humanoid-only gate, no legendary
  resistance). This is legitimate within the game's current rules and contributes
  to the A0 lift; if it reads as too strong, that's a balance decision (humanoid
  gate / legendary resistance) the data above can inform.
- Absolute clear-rates remain an AI-floor read (the bot still underplays a real
  player); the deliverable is the **before/after direction** and the **relative**
  wizard-vs-martials shape, not the magnitudes.
