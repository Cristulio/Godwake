import type { Character } from '../../types/character';
import type { CombatState } from '../../types/combat';
import type { DiceRoller } from '../dice';
import { abilityModifier } from '../../types/abilities';
import { getMonster } from '../../content/monsters';
import { getActiveRoller } from '../dice/instance';
import { appendLog } from './log';
import { attachCombatVfx } from './vfx';
import {
  bardSongPlaying,
  hasWordsOfTerror,
  hasMantleOfDread,
  WHISPERS_FEAR_DC_BONUS,
  WHISPERS_FEAR_DURATION,
} from './bard';
import { spellSaveDC } from './spells/helpers';
import { t } from '../../i18n';

/**
 * College of Whispers — the dread that rides the Song. Called from the bard song
 * pulse (applyBardSongPulse, every player turn-start): while a Song plays the
 * terror sings on its own and frightens the enemy. At L3 (Words of Terror) it
 * grips the single deadliest living foe; at L10 (Mantle of Dread) it floods EVERY
 * living foe. Each target rolls a Wisdom save against the bard's spell save DC
 * (+ a tuning knob); a boss/elite (legendaryResistances > 0) saves with ADVANTAGE
 * — fear SOFTENS the marquee fight, never auto-locks it — exactly as Vicious
 * Mockery's rattle does. A failed save leaves the foe frightened, so its next
 * blow is thrown wild (disadvantage, read in monsterAttack). Re-applied each
 * round, so the uptime is the control; a made save simply lets the prior fright
 * tick down. No-op for a non-Whispers bard or a silent one. Uses the active
 * roller (the song pulse carries none of its own), the same fallback createCombat
 * leans on.
 */
export function applyDread(
  state: CombatState,
  character: Readonly<Character>,
  roller: DiceRoller = getActiveRoller(),
): CombatState {
  if (!hasWordsOfTerror(character) || !bardSongPlaying(character)) return state;
  if (state.status !== 'active') return state;

  const living = state.combatants.filter(
    (c) => c.kind === 'monster' && c.instance.hp.current > 0,
  );
  if (living.length === 0) return state;

  // Words of Terror grips the deadliest foe; Mantle of Dread floods them all.
  let targets = living;
  if (!hasMantleOfDread(character)) {
    let deadliest = living[0];
    for (const c of living) {
      if (c.kind === 'monster' && deadliest.kind === 'monster' && c.instance.hp.max > deadliest.instance.hp.max) {
        deadliest = c;
      }
    }
    targets = [deadliest];
  }

  const dc = spellSaveDC(character) + WHISPERS_FEAR_DC_BONUS;
  const gripped = new Set<string>();
  const newlyGrippedNames: string[] = [];

  for (const target of targets) {
    if (target.kind !== 'monster') continue;
    const monsterDef = getMonster(target.instance.defId);
    const wisMod = abilityModifier(monsterDef.abilityScores.wis ?? 10);
    const resoluteWill = (target.instance.legendaryResistances ?? 0) > 0;
    const save = roller.d20(resoluteWill ? 'advantage' : 'normal', wisMod);
    if (save.total >= dc) continue;
    const wasFrightened = target.instance.conditions.some((x) => x.name === 'frightened');
    gripped.add(target.id);
    if (!wasFrightened) newlyGrippedNames.push(target.instance.displayName);
  }

  if (gripped.size === 0) return state;

  let nextState: CombatState = {
    ...state,
    combatants: state.combatants.map((c) => {
      if (c.kind !== 'monster' || !gripped.has(c.id)) return c;
      return {
        ...c,
        instance: {
          ...c.instance,
          conditions: [
            ...c.instance.conditions.filter((x) => x.name !== 'frightened'),
            { name: 'frightened' as const, duration: { kind: 'rounds' as const, value: WHISPERS_FEAR_DURATION } },
          ],
        },
      };
    }),
  };

  // Only announce + cue freshly-gripped foes (a refresh on an already-frightened
  // foe is silent, so the log/SFX don't drone every round). The frighten VFX
  // routes through the existing debuff-frighten → spell_ice cue, so the dread
  // finally lands with sound + a visual, not just a log line (audio sweep).
  if (newlyGrippedNames.length > 0) {
    nextState = attachCombatVfx(nextState, 'debuff-frighten', 'player', [...gripped][0], 'cold');
    nextState = appendLog(nextState, {
      id: nextState.log.length + 1,
      kind: 'system',
      text: t('combat.log.dreadGrips', {
        name: character.name,
        targets: newlyGrippedNames.join(', '),
      }),
    });
  }

  return nextState;
}
