import { memo, useEffect, useRef, useState } from 'react';
import type { Character } from '../../types/character';
import type { MonsterInstance, AttackEvent, SpellEffectEvent } from '../../types/combat';
import { computeAC, isWildShaped } from '../../engine/character/derived';
import { isDragonForm } from '../../engine/combat/shapeChange';
import { isBearForm } from '../../engine/combat/bearForm';
import { MonsterPortrait } from './MonsterPortrait';
import { PlayerPortrait } from './PlayerPortrait';
import { BeastPortrait } from './BeastPortrait';
import { spriteSizeScale } from './spriteScale';
import { FloatingDamage, resolveSpriteFloat, attackAimedAt, isBatchedMultiattack, type FloatingDamageItem, type FloatSelf } from './FloatingDamage';
import { MirrorImages } from './SpellEffect';
import { IntentBadge } from './IntentBadge';
import { useT } from '../../i18n/useT';

type CommonProps = {
  isActiveTurn: boolean;
  facing: 'left' | 'right';
  /** Bumps when this sprite has just executed an attack. Triggers a lunge animation. */
  attackPulse: number;
  /** Latest attack event in combat — used to detect crits against this sprite. */
  lastAttack?: AttackEvent;
  /**
   * Every attack resolved in the most recent (atomic) turn commit. A monster
   * multiattack / multi-action turn lands several swings in one commit, so
   * `lastAttack` only carries the last — the earlier swings float off this batch
   * (the main float effect owns the last one).
   */
  attackEvents?: AttackEvent[];
  /** Latest spell-effect event — used to float a control verdict (LANDED/RESISTED) on this sprite. */
  spellEffectEvent?: SpellEffectEvent;
  /**
   * Per-target batch from an AoE control cast (Entangle). Each sprite floats the
   * entry whose targetId is its own, so EVERY rooted/resisted foe gets a verdict,
   * not just the anchor. Fresh array per emit — compared by reference in the memo.
   */
  spellEffectEvents?: SpellEffectEvent[];
};

type PlayerProps = CommonProps & {
  kind: 'player';
  character: Character;
};

type MonsterProps = CommonProps & {
  kind: 'monster';
  instance: MonsterInstance;
  selectable: boolean;
  onSelect?: () => void;
  /**
   * boss-framework: the active condition-gate ward label ("destroy the heart")
   * when this boss is currently warded, else undefined. Computed in Battlefield,
   * which can see the whole field (the linked add).
   */
  wardLabel?: string;
  /** boss-framework: the active phase name once this boss has shifted, else undefined. */
  phaseLabel?: string;
  /** Display-side shrink factor (≤1) applied when the enemy row is crowded, so a
   *  field full of summoned adds compresses instead of overlapping the hero. */
  scale?: number;
  /** True when this monster is the ranger's marked quarry — floats a small
   *  amber reticle on the sprite so the mark reads on the battlefield, not
   *  only in the FOCUS row. */
  marked?: boolean;
};

export type BattlefieldSpriteProps = PlayerProps | MonsterProps;

/**
 * Hand-tuned base footprint per sprite (px), independent of lore size — it
 * encodes how much of each SVG's viewBox the art fills (a wide spider vs. a
 * narrow humanoid). Size scaling rides on top of this. Sprites without an entry
 * (most of Chapter 5+, including the giants and dragons) use the medium
 * baseline and lean entirely on the size factor.
 */
function monsterSpriteBaseWidth(defId: string): number {
  switch (defId) {
    case 'goblin-warden':
    case 'duergar-ilyich':
      return 80;
    case 'bugbear':
      return 92;
    case 'animated-armor':
      return 84;
    case 'skeleton':
      return 70;
    case 'dust-mephit':
      return 72;
    case 'imp':
      return 64;
    case 'kobold':
      return 50;
    case 'goblin':
      return 56;
    case 'hobgoblin':
      return 82;
    case 'ghoul':
      return 72;
    case 'stirge':
      return 60;
    case 'cult-fanatic':
      return 76;
    case 'shadow':
      return 78;
    case 'cowled-enforcer':
      return 80;
    case 'slaver-cuirassier':
      return 88;
    case 'athkatla-magistrate':
      return 92;
    case 'bandit-captain':
      return 84;
    case 'dust-mephit-elder':
      return 84;
    case 'bone-stalker':
      return 78;
    case 'shadow-hound':
      return 88;
    case 'bonebound-test-subject':
      return 78;
    case 'hollow-sage':
      return 78;
    case 'mad-mage-prisoner':
      return 76;
    case 'drow-warrior':
      return 80;
    case 'drow-crossbowman':
      return 78;
    case 'drow-matron-mother':
      return 92;
    case 'drider':
      return 110;
    case 'driderling':
      return 54;
    case 'mind-flayer-fragment':
      return 74;
    case 'slayer-hound':
      return 92;
    case 'asylum-director':
      return 96;
    case 'wardens-apprentice':
      return 80;
    case 'plaguebound-cur':
      return 84;
    case 'cell-wight':
      return 76;
    case 'famished-ghast':
      return 74;
    case 'duergar-taskmaster':
      return 82;
    case 'cowled-conjurer':
      return 80;
    case 'lash-captain':
      return 84;
    case 'cowled-wardpriest':
      return 80;
    case 'gibbering-husk':
      return 78;
    case 'mind-leech':
      return 54;
    case 'sphere-aberration':
      return 96;
    case 'asylum-fleshwright':
      return 82;
    case 'spider-broodmother':
      return 112;
    case 'drow-war-priestess':
      return 80;
    case 'cavern-hunting-spider':
      return 100;
    default:
      return 60;
  }
}

/**
 * Widest a sprite may render. The broodmother already sits here (112px) and
 * composes in the 96px battlefield slot plus its inter-slot gap, so capping
 * here keeps a scaled-up huge creature from clipping the HP bar or its
 * neighbour. A floor keeps a shrunk tiny creature from collapsing to a sliver.
 */
const SPRITE_MAX_WIDTH = 112;
const SPRITE_MIN_WIDTH = 36;

/** On-field sprite width: art base scaled by lore size, clamped to slot bounds.
 *  Because the sprite is bottom-anchored above its HP bar, the extra height of a
 *  scaled-up creature grows UPWARD from the same ground line — bigger reads as
 *  taller, not as a centred zoom. */
function monsterSpriteWidth(instance: MonsterInstance): number {
  const scaled = monsterSpriteBaseWidth(instance.defId) * spriteSizeScale(instance.size);
  return Math.max(SPRITE_MIN_WIDTH, Math.min(SPRITE_MAX_WIDTH, scaled));
}

/** Spark colour for an impact burst, keyed off the blow's damage type. Physical
 *  and absent types use the default torch amber so a sword hit reads as steel. */
function sparkTint(damageType: string | undefined): { color: string; glow: string } {
  switch (damageType) {
    case 'fire':
      return { color: '#ff7a3a', glow: '0 0 6px rgba(255,107,43,0.95)' };
    case 'cold':
      return { color: '#8fe6ff', glow: '0 0 6px rgba(143,230,255,0.95)' };
    case 'lightning':
      return { color: '#ffe066', glow: '0 0 6px rgba(255,224,102,0.95)' };
    case 'poison':
    case 'acid':
      return { color: '#b6f04a', glow: '0 0 6px rgba(146,200,30,0.95)' };
    case 'necrotic':
      return { color: '#b07ad8', glow: '0 0 6px rgba(176,122,216,0.95)' };
    case 'radiant':
      return { color: '#ffe9a8', glow: '0 0 6px rgba(255,220,120,0.95)' };
    case 'force':
      return { color: '#c9a8ff', glow: '0 0 6px rgba(201,168,255,0.95)' };
    case 'psychic':
      return { color: '#ff8ae0', glow: '0 0 6px rgba(255,138,224,0.95)' };
    default:
      return {
        color: 'var(--color-accent-torch)',
        glow: '0 0 6px rgba(255,179,71,0.95), 0 0 14px rgba(255,71,48,0.6)',
      };
  }
}

function BattlefieldSpriteImpl(props: BattlefieldSpriteProps) {
  const { t } = useT();
  const hpCurrent =
    props.kind === 'player' ? props.character.hp.current : props.instance.hp.current;
  const hpMax = props.kind === 'player' ? props.character.hp.max : props.instance.hp.max;
  const hpTemp =
    props.kind === 'player' ? props.character.hp.temp : props.instance.hp.temp;
  const ac = props.kind === 'player' ? computeAC(props.character) : props.instance.ac;
  const acVisible = props.kind === 'player' ? true : props.instance.acRevealed;
  const name = props.kind === 'player' ? props.character.name : props.instance.displayName;
  const dead = hpCurrent <= 0;
  // When temp HP is present, scale the bar against (max + temp) so the temp
  // buffer reads as an extension of the bar instead of overlapping current.
  const hpScale = hpMax + hpTemp;
  const hpPercent = hpScale > 0 ? (hpCurrent / hpScale) * 100 : 0;
  const tempPercent = hpScale > 0 ? (hpTemp / hpScale) * 100 : 0;
  const healthRatio = hpMax > 0 ? hpCurrent / hpMax : 0;

  const prevHp = useRef(hpCurrent);
  const [damageFloats, setDamageFloats] = useState<FloatingDamageItem[]>([]);
  const [hitFlash, setHitFlash] = useState<'normal' | 'crit' | null>(null);
  const [hitPause, setHitPause] = useState(false);
  const [sparks, setSparks] = useState<
    Array<{ id: number; dx: number; dy: number; color: string; glow: string; size: number }>
  >([]);
  const [knockback, setKnockback] = useState<'left' | 'right' | null>(null);
  const [lunge, setLunge] = useState(false);
  const lastAttackPulse = useRef(props.attackPulse);
  const lastSeenAttackId = useRef<number | undefined>(undefined);
  const lastSeenSpellEffectId = useRef<number | undefined>(undefined);
  // The spell-vamp heal batch isn't cleared between commits (like attackEvents),
  // so the main effect must only defer to it once — on the commit that emitted
  // it — or a later unrelated heal (potion) would be wrongly suppressed.
  const lastDeferredHealBatch = useRef<SpellEffectEvent[] | undefined>(undefined);

  // The floating combat number. Sourced from the landing attack event so it
  // shows the TRUE rolled damage (crits, affix bonuses, off-type all live in
  // `damageDealt`) instead of the clamped HP delta — overkill and temp-HP soak
  // no longer collapse the number to "1". Non-attack damage (poison/bleed
  // ticks, environment) falls back to the HP delta; HP gains float as heals.
  // Keyed on both HP and the latest attack id so a landed-but-fully-soaked hit
  // still surfaces its number.
  useEffect(() => {
    const attackId = props.lastAttack?.id;
    const isNewAttack = attackId !== undefined && attackId !== lastSeenAttackId.current;
    const hpDelta = prevHp.current - hpCurrent;
    const self: FloatSelf =
      props.kind === 'player'
        ? { kind: 'player' }
        : { kind: 'monster', displayName: props.instance.displayName };
    // Multi-swing turn aimed at this sprite: the batch effect floats every swing
    // (and the cues), so defer here — just advance the bookkeeping so the hpDelta
    // fallback doesn't double-count the swings' damage as a phantom tick. Guards
    // against a stale monster batch capturing the player's fresh swing (see
    // isBatchedMultiattack) — that would otherwise eat the player's damage float.
    const batched = isBatchedMultiattack(props.attackEvents, props.lastAttack, self);
    if (batched) {
      prevHp.current = hpCurrent;
      if (attackId !== undefined) lastSeenAttackId.current = attackId;
      return;
    }
    // A fresh single-target damage SPELL on this sprite: the spell-effect
    // effect below floats the event's TRUE damage (overkill shows the real
    // number, not the clamped HP delta) — defer here, bookkeeping only. The
    // spell effect runs after this one in the same commit and marks the id.
    const ev = props.spellEffectEvent;
    const myId = props.kind === 'player' ? 'player' : props.instance.id;
    if (
      ev &&
      (ev.damage ?? 0) > 0 &&
      ev.targetId === myId &&
      ev.id !== lastSeenSpellEffectId.current
    ) {
      prevHp.current = hpCurrent;
      if (attackId !== undefined) lastSeenAttackId.current = attackId;
      return;
    }
    // A spell-vamp heal arrives as an explicit batch entry (floated by the batch
    // effect below). Defer the hpDelta heal here so the same drink isn't floated
    // twice — but only on the commit that emitted the batch (the batch isn't
    // cleared afterward, so a stale entry must not suppress a later heal).
    const healBatch = props.spellEffectEvents;
    if (
      healBatch &&
      healBatch !== lastDeferredHealBatch.current &&
      healBatch.some((e) => (e.heal ?? 0) > 0 && e.targetId === myId)
    ) {
      lastDeferredHealBatch.current = healBatch;
      prevHp.current = hpCurrent;
      if (attackId !== undefined) lastSeenAttackId.current = attackId;
      return;
    }
    const float = resolveSpriteFloat({ lastAttack: props.lastAttack, self, hpDelta, isNewAttack });
    prevHp.current = hpCurrent;
    if (attackId !== undefined) lastSeenAttackId.current = attackId;

    if (!float) {
      // Whiff — a fresh swing aimed at this sprite that missed floats a faint
      // MISS so a dodged blow still reads on the battlefield.
      if (isNewAttack && props.lastAttack && !props.lastAttack.hit && attackAimedAt(props.lastAttack, self)) {
        const id = Date.now() + Math.random();
        setDamageFloats((d) => [...d, { id, amount: 0, kind: 'miss' }]);
        setTimeout(() => setDamageFloats((d) => d.filter((x) => x.id !== id)), 1000);
      }
      return;
    }

    // The cues below (flash, recoil, sparks) read as a struck blow, so only
    // arm them for a fresh landed attack — not a poison/bleed tick that fell
    // back to the HP delta.
    const fromAttack = isNewAttack && !!props.lastAttack?.hit;
    const damageType = fromAttack && float.kind !== 'heal' ? props.lastAttack?.damageType : undefined;

    const id = Date.now() + Math.random();
    setDamageFloats((d) => [...d, { id, amount: float.amount, kind: float.kind, damageType }]);

    if (float.kind === 'heal') {
      setTimeout(() => setDamageFloats((d) => d.filter((x) => x.id !== id)), 1500);
      return;
    }

    const isCrit = float.kind === 'crit';
    setTimeout(
      () => setDamageFloats((d) => d.filter((x) => x.id !== id)),
      isCrit ? 1500 : 1200,
    );

    setHitFlash(isCrit ? 'crit' : 'normal');
    setTimeout(() => setHitFlash(null), isCrit ? 320 : 240);
    setHitPause(true);
    setTimeout(() => setHitPause(false), 160);

    // Knockback recoil — the struck sprite is shoved away from its attacker.
    // The attacker stands on the side this sprite faces, so it reels the
    // opposite way. The offensive swing itself rides the VFX bus overlay.
    const recoil: 'left' | 'right' = props.facing === 'right' ? 'left' : 'right';
    setKnockback(recoil);
    setTimeout(() => setKnockback((k) => (k === recoil ? null : k)), 300);

    // Impact spark burst at the point of contact, tinted by the blow's element.
    // Crits throw a wide radial shower; ordinary landed hits still kick a few
    // sparks so every connecting blow pops. DoT/environment ticks stay quiet.
    if (isCrit || fromAttack) {
      const { color, glow } = sparkTint(damageType);
      const count = isCrit ? 8 : 4;
      const minDist = isCrit ? 36 : 22;
      const spreadDist = isCrit ? 20 : 14;
      const size = isCrit ? 6 : 4;
      const burst = Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
        const dist = minDist + Math.random() * spreadDist;
        return {
          id: id + i + 1,
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist - 8,
          color,
          glow,
          size,
        };
      });
      setSparks((s) => [...s, ...burst]);
      setTimeout(() => {
        setSparks((s) => s.filter((sp) => !burst.find((b) => b.id === sp.id)));
      }, 600);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hpCurrent, props.lastAttack?.id]);

  // Multi-swing monster turn (a Fire Giant's two strikes, a multi-action boss).
  // The whole turn commits one atomic state, so `lastAttack` only carries the
  // LAST swing — left to the main effect alone the turn would float a single
  // number. When the batch holds 2+ swings the main effect defers (below) and
  // this effect floats EVERY swing aimed at this sprite, staggered so they read
  // as distinct blows. Keyed on the batch array identity — a fresh array per
  // turn, so it fires once per turn and resets cleanly across fights (no
  // monotonic-id bookkeeping).
  useEffect(() => {
    const events = props.attackEvents;
    if (!events || events.length < 2) return;
    const self: FloatSelf =
      props.kind === 'player'
        ? { kind: 'player' }
        : { kind: 'monster', displayName: props.instance.displayName };
    const swings = events.filter((e) => attackAimedAt(e, self));
    if (swings.length === 0) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    swings.forEach((e, i) => {
      timers.push(
        setTimeout(() => {
          const float = resolveSpriteFloat({ lastAttack: e, self, hpDelta: 0, isNewAttack: true });
          const id = Date.now() + Math.random();
          if (!float) {
            if (!e.hit) {
              setDamageFloats((d) => [...d, { id, amount: 0, kind: 'miss' }]);
              timers.push(setTimeout(() => setDamageFloats((d) => d.filter((x) => x.id !== id)), 1000));
            }
            return;
          }
          const isCrit = float.kind === 'crit';
          const damageType = e.hit && float.kind !== 'heal' ? e.damageType : undefined;
          setDamageFloats((d) => [...d, { id, amount: float.amount, kind: float.kind, damageType }]);
          timers.push(
            setTimeout(() => setDamageFloats((d) => d.filter((x) => x.id !== id)), isCrit ? 1500 : 1200),
          );
          setHitFlash(isCrit ? 'crit' : 'normal');
          timers.push(setTimeout(() => setHitFlash(null), isCrit ? 320 : 240));
        }, i * 160),
      );
    });
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.attackEvents]);

  // The spell-effect bus floats two things on the target sprite:
  //  - a control verdict (LANDED / RESISTED) for outcome-carrying casts, and
  //  - the TRUE rolled damage of a single-target damage cast (`ev.damage`), so
  //    an overkill shows the spell's real number instead of the clamped HP
  //    delta (the main effect above defers to this one for those events).
  useEffect(() => {
    const ev = props.spellEffectEvent;
    if (!ev || (!ev.outcome && !(ev.damage && ev.damage > 0))) return;
    const isNew = ev.id !== lastSeenSpellEffectId.current;
    lastSeenSpellEffectId.current = ev.id;
    if (!isNew) return;
    const myId = props.kind === 'player' ? 'player' : props.instance.id;
    if (ev.targetId !== myId) return;
    const id = Date.now() + Math.random();
    if (ev.outcome) {
      setDamageFloats((d) => [...d, { id, amount: 0, kind: ev.outcome! }]);
      setTimeout(() => setDamageFloats((d) => d.filter((x) => x.id !== id)), 1200);
      return;
    }
    setDamageFloats((d) => [
      ...d,
      { id, amount: ev.damage!, kind: 'damage', damageType: ev.element },
    ]);
    setTimeout(() => setDamageFloats((d) => d.filter((x) => x.id !== id)), 1200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.spellEffectEvent?.id]);

  // AoE control cast (Entangle): one verdict per foe arrives in this batch. Each
  // sprite floats the entry aimed at it, so every rooted (LANDED) / saved
  // (RESISTED) foe shows its own verdict — not just the anchor. The same batch
  // also carries the spell-vamp heal number (an explicit green heal on the
  // player), so a multi-foe AoE drink floats reliably instead of riding the
  // fragile hpDelta inference. Keyed on the array identity (a fresh array per
  // emit), mirroring the attackEvents batch.
  useEffect(() => {
    const events = props.spellEffectEvents;
    if (!events || events.length === 0) return;
    const myId = props.kind === 'player' ? 'player' : props.instance.id;
    const mine = events.filter(
      (e) => e.targetId === myId && (e.outcome || (e.heal ?? 0) > 0),
    );
    if (mine.length === 0) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    mine.forEach((e) => {
      const id = Date.now() + Math.random();
      if (e.outcome) {
        setDamageFloats((d) => [...d, { id, amount: 0, kind: e.outcome! }]);
        timers.push(setTimeout(() => setDamageFloats((d) => d.filter((x) => x.id !== id)), 1200));
        return;
      }
      setDamageFloats((d) => [...d, { id, amount: e.heal!, kind: 'heal' }]);
      timers.push(setTimeout(() => setDamageFloats((d) => d.filter((x) => x.id !== id)), 1500));
    });
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.spellEffectEvents]);

  // Lunge only when this sprite has actually attacked (attackPulse bumps).
  useEffect(() => {
    if (props.attackPulse === lastAttackPulse.current) return;
    if (props.attackPulse === 0) return;
    lastAttackPulse.current = props.attackPulse;
    if (dead) return;
    setLunge(true);
    const t = setTimeout(() => setLunge(false), 460);
    return () => clearTimeout(t);
  }, [props.attackPulse, dead]);

  const selectable = props.kind === 'monster' && props.selectable && !dead;
  // enemy-telegraph: show the monster's next-turn intent, except while it's
  // mid-execution on its own turn (the action is already resolving).
  const intent =
    props.kind === 'monster' && !dead && !props.isActiveTurn ? props.instance.intent : undefined;

  const lungeClass = lunge
    ? props.facing === 'right'
      ? 'animate-lunge-right'
      : 'animate-lunge-left'
    : '';
  // === animations-revamp === persistent condition states. The sprite's resting
  // animation tells its state: a staggered foe slumps under its dizzy-star halo,
  // a paralyzed one shivers against the bind, a frightened one rattles. One
  // state class at a time (strongest read wins) so transforms never compound.
  const conditions =
    props.kind === 'player' ? props.character.conditions : props.instance.conditions;
  const staggered =
    !dead && props.kind === 'monster' && (props.instance.staggeredTurns ?? 0) > 0;
  const held = !dead && !staggered && conditions.some((c) => c.name === 'paralyzed');
  const frightened =
    !dead && !staggered && !held && conditions.some((c) => c.name === 'frightened');
  const idleClass = dead
    ? 'animate-die-fall'
    : staggered
      ? 'animate-stun-slump'
      : held
        ? 'animate-held-shiver'
        : frightened
          ? 'animate-fright-rattle'
          : 'animate-idle-breath';
  const knockbackClass =
    knockback === 'left'
      ? 'animate-knockback-left'
      : knockback === 'right'
        ? 'animate-knockback-right'
        : '';

  return (
    <button
      type="button"
      disabled={!selectable}
      onClick={props.kind === 'monster' ? props.onSelect : undefined}
      className={`
        relative flex flex-col items-center gap-1 transition-opacity
        ${selectable ? 'cursor-pointer' : 'cursor-default'}
        ${dead ? 'opacity-40' : ''}
        disabled:cursor-default
      `}
    >
      <div className="h-5 flex items-end justify-center mb-0.5">
        {intent && (
          <IntentBadge
            intent={intent}
            monsterId={props.kind === 'monster' ? props.instance.defId : undefined}
          />
        )}
      </div>

      <div className="text-[var(--color-text-secondary)] text-[10px] uppercase tracking-widest font-bold mb-0.5 font-display">
        {name}
      </div>

      {/* boss-framework: persistent boss-state chips — the active condition gate
          ("warded — destroy the heart") and the current phase. Static (no
          animation) so reduced-motion is honoured automatically. */}
      {props.kind === 'monster' && !dead && (props.wardLabel || props.phaseLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-1 mb-0.5 max-w-[128px]">
          {props.wardLabel && (
            <span
              className="boss-state-chip boss-state-warded"
              title={`Warded — ${props.wardLabel}. This enemy takes greatly reduced damage until then.`}
              aria-label={`Warded — invulnerable until you ${props.wardLabel}.`}
            >
              <svg viewBox="0 0 12 12" className="boss-state-chip-icon" aria-hidden="true">
                <path
                  d="M6 1 L10 2.5 V6 C10 9 6 11 6 11 C6 11 2 9 2 6 V2.5 Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
              </svg>
              <span>{props.wardLabel}</span>
            </span>
          )}
          {props.phaseLabel && (
            <span
              className="boss-state-chip boss-state-phase"
              title={`${props.phaseLabel} — this enemy has entered a new phase.`}
              aria-label={`Phase: ${props.phaseLabel}.`}
            >
              {props.phaseLabel}
            </span>
          )}
        </div>
      )}

      <div
        className={`
          relative flex items-end justify-center isolate
          ${selectable ? 'drop-shadow-[0_0_18px_rgba(244,167,66,0.55)] hover:scale-[1.06] transition-transform' : ''}
          ${props.isActiveTurn && !dead ? 'drop-shadow-[0_0_18px_rgba(255,179,71,0.55)]' : ''}
        `}
        style={{
          width:
            props.kind === 'player'
              ? '84px'
              : `${monsterSpriteWidth(props.instance) * (props.scale ?? 1)}px`,
        }}
      >
        {props.kind === 'player' && !dead && (
          <MirrorImages
            classId={props.character.classId}
            count={props.character.resources.mirrorImages ?? 0}
          />
        )}
        {selectable && (
          <div className="absolute inset-0 border-2 border-[var(--color-accent-amber)] -m-1 pointer-events-none animate-pulse-glow" />
        )}
        {props.kind === 'monster' && props.marked && !dead && (
          <div
            className="absolute -top-1 -right-1 z-10 pointer-events-none"
            title={t('combat.quarryMarked')}
          >
            <svg viewBox="0 0 12 12" className="w-4 h-4" aria-label={t('combat.quarryMarked')}>
              <circle cx="6" cy="6" r="4.4" fill="none" stroke="var(--color-accent-amber)" strokeWidth="1.4" />
              <line x1="6" y1="0.4" x2="6" y2="3" stroke="var(--color-accent-amber)" strokeWidth="1.4" />
              <line x1="6" y1="9" x2="6" y2="11.6" stroke="var(--color-accent-amber)" strokeWidth="1.4" />
              <line x1="0.4" y1="6" x2="3" y2="6" stroke="var(--color-accent-amber)" strokeWidth="1.4" />
              <line x1="9" y1="6" x2="11.6" y2="6" stroke="var(--color-accent-amber)" strokeWidth="1.4" />
              <circle cx="6" cy="6" r="1.1" fill="var(--color-accent-blood)" />
            </svg>
          </div>
        )}
        <div className={`relative w-full ${knockbackClass}`}>
          <div
            className={`
              relative w-full ${lungeClass || idleClass} ${hitPause ? 'animate-hit-pause' : ''}
              ${props.facing === 'left' ? '-scale-x-100' : ''}
            `}
          >
            {props.kind === 'monster' ? (
              <MonsterPortrait
                defId={props.instance.defId}
                className="w-full h-auto"
              />
            ) : isDragonForm(props.character) ? (
              // Shape Change: the caster IS a dragon for the duration — wear
              // the dragon's battlefield body (the wyrm sprite), not the robe.
              // Purely visual; reverts when the form's rounds run out.
              <MonsterPortrait defId="nizidramaniiyt" className="w-full h-auto" />
            ) : isBearForm(props.character) ? (
              // Avatar of the Wilds: the druid IS the Great Bear — wear the apex
              // beast body (bigger/darker than a routine shift), never the robe.
              // Takes precedence over Wild Shape; reverts when bearForm rounds end.
              <BeastPortrait variant="great-bear" className="w-full h-auto" />
            ) : isWildShaped(props.character) ? (
              // Wild Shape swaps the druid's battlefield form for a beast
              // silhouette — purely visual; reverts when the form spends out
              // (wildShapeRoundsRemaining → 0 on turn/createCombat reset).
              <BeastPortrait className="w-full h-auto" />
            ) : (
              <PlayerPortrait
                classId={props.character.classId}
                className="w-full h-auto"
              />
            )}
            {hitFlash === 'normal' && (
              <div className="absolute inset-0 bg-[var(--color-accent-blood)] opacity-55 mix-blend-screen pointer-events-none" />
            )}
            {hitFlash === 'crit' && (
              <div className="absolute inset-0 pointer-events-none animate-hit-flash-crit" />
            )}
            {/* Hurt tint — a bloodied sprite reads as wounded, slow throb so it
                feels like labored breathing rather than a static recolour. */}
            {!dead && healthRatio <= 0.3 && (
              <div className="absolute inset-0 bg-[var(--color-accent-blood)] mix-blend-multiply pointer-events-none animate-hurt-tint" />
            )}
            {/* Bind shimmer — a paralyzed sprite carries a faint arcane ring at
                the torso while the hold lasts (the shiver above is the motion). */}
            {held && (
              <div
                className="absolute left-1/2 top-[46%] pointer-events-none"
                aria-hidden="true"
                style={{ width: 0, height: 0 }}
              >
                <svg
                  width="72"
                  height="30"
                  viewBox="-36 -15 72 30"
                  style={{ position: 'absolute', left: -36, top: -15, overflow: 'visible' }}
                >
                  <ellipse cx="0" cy="0" rx="30" ry="11" fill="none" stroke="#9b6fcf" strokeWidth="1.8" opacity="0.7" />
                  <ellipse cx="0" cy="0" rx="24" ry="8" fill="none" stroke="#c9a8ff" strokeWidth="0.8" opacity="0.55" strokeDasharray="3 4" />
                </svg>
              </div>
            )}
          </div>
        </div>
        {/* Dizzy-star halo — a staggered foe wears orbiting stars until its lost
            turn passes. Stars ride a translate-ellipse keyframe; under
            prefers-reduced-motion they rest spread on the rim (index.css). */}
        {staggered && (
          <div
            className="absolute left-1/2 -top-2 pointer-events-none z-10"
            aria-hidden="true"
            style={{ width: 0, height: 0 }}
          >
            <svg
              width="72"
              height="28"
              viewBox="-36 -14 72 28"
              style={{ position: 'absolute', left: -36, top: -14, overflow: 'visible' }}
            >
              <ellipse cx="0" cy="0" rx="27" ry="9" fill="none" stroke="#ffd166" strokeWidth="1.2" opacity="0.5" strokeDasharray="4 5" />
            </svg>
            <div className="absolute" style={{ left: 0, top: 0, width: 0, height: 0 }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="absolute animate-stun-star-orbit"
                  style={{
                    left: -7,
                    top: -7,
                    width: 14,
                    height: 14,
                    animationDelay: `${-i * 600}ms`,
                  }}
                >
                  <svg width="14" height="14" viewBox="-7 -7 14 14" style={{ overflow: 'visible' }}>
                    <polygon
                      points="0,-6 1.6,-1.6 6,0 1.6,1.6 0,6 -1.6,1.6 -6,0 -1.6,-1.6"
                      fill="#ffd166"
                      stroke="#fff5d1"
                      strokeWidth="0.5"
                    />
                  </svg>
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Impact sparks — element-tinted, sized by hit weight */}
        {sparks.map((s) => (
          <div
            key={s.id}
            className="absolute left-1/2 top-1/2 pointer-events-none animate-spark rounded-[1px]"
            style={{
              width: s.size,
              height: s.size,
              background: s.color,
              boxShadow: s.glow,
              ['--spark-dest' as string]: `translate(${s.dx}px, ${s.dy}px)`,
            }}
          />
        ))}
        <FloatingDamage items={damageFloats} />
        {dead && (
          <div className="absolute inset-x-0 bottom-2 flex items-center justify-center text-[var(--color-accent-blood)] text-[10px] uppercase tracking-[0.3em] font-bold font-display">
            {t('combat.slain')}
          </div>
        )}
      </div>

      <div className="w-20 flex flex-col gap-0.5 mt-1">
        <div className="flex justify-between text-[10px] font-mono">
          <span className="text-[var(--color-text-dim)] font-display text-[8px]">HP</span>
          <span className="text-[var(--color-text-primary)]">
            {hpCurrent}/{hpMax}
            {hpTemp > 0 && (
              <span
                className="ml-0.5 text-[var(--color-accent-amber)]"
                title={`+${hpTemp} temporary HP — absorbs damage first`}
              >
                +{hpTemp}
              </span>
            )}
          </span>
        </div>
        <div className="h-2 bg-[var(--color-bg-deep)] border border-[var(--color-border-dim)] overflow-hidden relative flex">
          <div
            className={`h-full transition-all duration-500 ease-out ${
              props.kind === 'monster'
                ? healthRatio > 0.5
                  ? 'bg-gradient-to-r from-[var(--color-accent-blood)] to-[var(--color-accent-deep-blood)]'
                  : 'bg-gradient-to-r from-[var(--color-accent-deep-blood)] to-[var(--color-accent-blood)] animate-pulse'
                : healthRatio > 0.5
                  ? 'bg-gradient-to-r from-[var(--color-status-poison)] to-[#5a8013]'
                  : healthRatio > 0.25
                    ? 'bg-gradient-to-r from-[var(--color-accent-amber)] to-[var(--color-accent-torch)]'
                    : 'bg-gradient-to-r from-[var(--color-accent-blood)] to-[var(--color-accent-deep-blood)] animate-pulse'
            }`}
            style={{ width: `${hpPercent}%` }}
          />
          {hpTemp > 0 && (
            <div
              className="h-full bg-[var(--color-accent-amber)]/65 border-l border-[var(--color-bg-base)] transition-all duration-500 ease-out"
              style={{ width: `${tempPercent}%` }}
              title={`+${hpTemp} temporary HP`}
            />
          )}
          {/* Glossy shine on top half */}
          <div
            className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent pointer-events-none"
          />
        </div>
        <div className="text-[10px] text-[var(--color-text-dim)] font-mono text-center">
          <span className="font-display text-[8px] mr-1">AC</span>
          {acVisible ? ac : '?'}
        </div>
      </div>
    </button>
  );
}

/**
 * Memoized: combat state changes ~6-8x in a single dice/swing/hit cascade.
 * A sprite only needs to re-render when its OWN HP / activity / attack-pulse
 * changes, or when the latest attack might target it. The comparator below
 * skips render when none of those changed.
 */
export const BattlefieldSprite = memo(BattlefieldSpriteImpl, (prev, next) => {
  if (prev.kind !== next.kind) return false;
  if (prev.isActiveTurn !== next.isActiveTurn) return false;
  if (prev.facing !== next.facing) return false;
  if (prev.attackPulse !== next.attackPulse) return false;
  // lastAttack: only matters if it CHANGES — a new event id triggers a flash.
  // Sprite reads `lastAttack` to detect crits against itself, so id is enough.
  if (prev.lastAttack?.id !== next.lastAttack?.id) return false;
  // attackEvents: a fresh per-turn batch (multi-swing turns) must re-render so
  // each swing floats. New array identity each turn — compare by reference.
  if (prev.attackEvents !== next.attackEvents) return false;
  // spellEffectEvent: a new id may carry a control verdict to float on this sprite.
  if (prev.spellEffectEvent?.id !== next.spellEffectEvent?.id) return false;
  // spellEffectEvents: a fresh AoE-control batch must re-render so each foe floats
  // its own verdict. New array identity per emit — compare by reference.
  if (prev.spellEffectEvents !== next.spellEffectEvents) return false;
  if (prev.kind === 'player' && next.kind === 'player') {
    return (
      prev.character.hp.current === next.character.hp.current &&
      prev.character.hp.max === next.character.hp.max &&
      prev.character.hp.temp === next.character.hp.temp &&
      prev.character === next.character // catch any other field via identity
    );
  }
  if (prev.kind === 'monster' && next.kind === 'monster') {
    // onSelect intentionally NOT compared — Battlefield re-creates an
    // arrow each render (`() => onSelectTarget(c.id)`). Including it here
    // would defeat the memo. The closure captures the monster id, which
    // doesn't change for a given combatant.
    return (
      prev.selectable === next.selectable &&
      prev.scale === next.scale &&
      prev.marked === next.marked &&
      // boss-framework: ward/phase chips flip on field changes (add dies, boss
      // shifts) without the instance identity necessarily moving — compare them.
      prev.wardLabel === next.wardLabel &&
      prev.phaseLabel === next.phaseLabel &&
      prev.instance.hp.current === next.instance.hp.current &&
      prev.instance.hp.max === next.instance.hp.max &&
      prev.instance.hp.temp === next.instance.hp.temp &&
      prev.instance.ac === next.instance.ac &&
      prev.instance.acRevealed === next.instance.acRevealed &&
      prev.instance === next.instance
    );
  }
  return false;
});
