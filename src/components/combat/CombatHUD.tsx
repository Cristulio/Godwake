import { type ReactNode } from 'react';
import type { Character } from '../../types/character';
import { TouchTooltip } from '../ui/TouchTooltip';
import type { CombatState } from '../../types/combat';
import { computeAC, critRange } from '../../engine/character/derived';
import {
  rogueCunningActionMax,
  wizardSpellSlotsForLevel,
  rageChargesMax,
  isRageUnlimited,
} from '../../engine/character/actions';
import {
  martialFlavor,
  martialPointsLeft,
  martialPoolMax,
} from '../../engine/combat/martialResource';
import { turnsUntilCunningRegen } from '../../engine/combat/cunningAction';
import { spellAttackBonus, spellSaveDC } from '../../engine/combat/spells';
import { monkKiMax } from '../../engine/combat/monk';
import { getBlessing } from '../../content/blessings';
import { bossIntelBuffFor } from '../../content/bossIntel';
import { baneQuirkCount } from '../../engine/character/quirks';
import {
  BLESSING_GOD_GLYPH,
  type Blessing,
  type BlessingModifiers,
} from '../../schemas/blessing';
import { t } from '../../i18n';
import { useT } from '../../i18n/useT';

const UNCANNY_DODGE_LEVEL = 5;
const NIMBLE_DODGE_MAX_LEVEL = 4;
const GUARD_MAX_LEVEL = 4;
const BLOODIED_RATIO = 0.5;

interface CombatHUDProps {
  character: Character;
  state: CombatState;
  onToggleShieldAutoFire?: () => void;
}

function fighterActionSurgeMax(level: number): number {
  if (level >= 17) return 2;
  if (level >= 2) return 1;
  return 0;
}

function conditionGlyph(name: string): string {
  switch (name) {
    case 'paralyzed': return '⛓';
    case 'blinded': return '◐';
    case 'poisoned': return '☣';
    case 'frightened': return '!';
    case 'restrained': return '⊠';
    default: return '◇';
  }
}

// Wizard buffs are tracked by their stable English id; these helpers localize the
// HUD label + tooltip. Numbers mirror the wizard-buff branch in computeAC (Mage
// Armor +3 over the 10+DEX base = 13+DEX while unarmored; Shield +5; Misty Step +2).
function wizardBuffName(id: string): string {
  switch (id) {
    case 'Mage Armor': return t('combat.hud.mageArmorName');
    case 'Shield': return t('combat.hud.shieldName');
    case 'Misty Step': return t('combat.hud.mistyStepName');
    default: return id;
  }
}

function wizardBuffDescription(id: string): string {
  switch (id) {
    case 'Mage Armor': return t('combat.hud.mageArmorDesc');
    case 'Shield': return t('combat.hud.shieldDesc');
    case 'Misty Step': return t('combat.hud.mistyStepDesc');
    default: return t('combat.hud.buffActive', { name: id });
  }
}

/**
 * Resolve a blessing's run-scaling levers into the concrete totals for THIS
 * run, so the HUD shows "+4 temp HP" instead of the "+2 per soul-mark" formula.
 * Mirrors how createCombat/derived fold these same fields (N × bane count, N ×
 * delve level). Returns null for blessings with no run-scaling lever — their
 * `effect` line already reads as a fixed number.
 */
export function resolveBlessingRunValue(
  modifiers: BlessingModifiers,
  character: Character,
): string | null {
  const banes = baneQuirkCount(character);
  const s = banes === 1 ? '' : t('combat.hud.soulMarkPlural');
  const parts: string[] = [];
  const tempHpPerBane = modifiers.tempHpPerBaneQuirk ?? 0;
  if (tempHpPerBane > 0) {
    parts.push(t('combat.hud.tempHpBane', { n: tempHpPerBane * banes, banes, s }));
  }
  const tempHpPerLevel = modifiers.tempHpPerDelveLevel ?? 0;
  if (tempHpPerLevel > 0) {
    parts.push(t('combat.hud.tempHpLevel', { n: tempHpPerLevel * character.level, level: character.level }));
  }
  const acPerBane = modifiers.acBonusPerBaneQuirk ?? 0;
  if (acPerBane > 0) {
    parts.push(t('combat.hud.acBane', { n: acPerBane * banes, banes, s }));
  }
  return parts.length > 0 ? parts.join(', ') : null;
}

function HpBar({
  current,
  max,
  temp,
}: {
  current: number;
  max: number;
  temp: number;
}) {
  const healthPct = max > 0 ? current / max : 0;
  const bloodied = healthPct <= 0.25;
  const hurt = healthPct <= 0.5;
  // Temp HP extends the visible pool so it reads as a real (gold) overshield
  // sitting past full health rather than overwriting it.
  const denom = max + temp;
  const fillW = denom > 0 ? (current / denom) * 100 : 0;
  const tempW = denom > 0 ? (temp / denom) * 100 : 0;
  const fillClass = bloodied
    ? 'from-[var(--color-accent-blood)] to-[var(--color-accent-deep-blood)]'
    : hurt
      ? 'from-[var(--color-accent-torch)] to-[var(--color-accent-amber)]'
      : 'from-[var(--color-dmg-heal)] to-[#3f9e30]';
  return (
    <div
      aria-hidden="true"
      className="relative h-2 w-full min-w-[132px] bg-[var(--color-bg-deep)] border border-[var(--color-border-dim)] overflow-hidden"
    >
      <div
        className={`absolute inset-y-0 left-0 bg-gradient-to-r ${fillClass} transition-[width] duration-500 ease-out ${bloodied ? 'animate-bloodied-throb' : ''}`}
        style={{ width: `${fillW}%` }}
      />
      {temp > 0 && (
        <div
          className="absolute inset-y-0 bg-[var(--color-accent-gold)]/75 border-l border-[var(--color-bg-base)] transition-[left,width] duration-500 ease-out"
          style={{ left: `${fillW}%`, width: `${tempW}%` }}
        />
      )}
      <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-hpbar-sheen pointer-events-none" />
      <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/12 to-transparent pointer-events-none" />
    </div>
  );
}

function Dot({ on, title }: { on: boolean; title?: string }) {
  return (
    <span
      title={title}
      aria-label={title}
      className={`inline-block w-2.5 h-2.5 border-2 ${
        on
          ? 'bg-[var(--color-accent-amber)] border-[var(--color-accent-gold)]'
          : 'bg-transparent border-[var(--color-border-dim)]'
      }`}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}

function Section({
  title,
  children,
  className = '',
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 px-2.5 py-1 border-r border-[var(--color-border-dim)] last:border-r-0 ${className}`}
    >
      <span className="text-[8px] uppercase tracking-[0.25em] text-[var(--color-text-dim)] font-bold">
        {title}
      </span>
      <div className="flex items-center gap-1.5">{children}</div>
    </div>
  );
}

function Pill({
  text,
  on,
  title,
  tone = 'amber',
}: {
  text: string;
  on: boolean;
  title?: string;
  tone?: 'amber' | 'blood' | 'gold';
}) {
  const toneClass = on
    ? tone === 'blood'
      ? 'bg-[var(--color-accent-deep-blood)] border-[var(--color-accent-blood)] text-[var(--color-text-primary)]'
      : tone === 'gold'
        ? 'bg-[var(--color-bg-panel)] border-[var(--color-accent-gold)] text-[var(--color-accent-amber)]'
        : 'bg-[var(--color-accent-amber)] border-[var(--color-accent-gold)] text-[var(--color-bg-base)]'
    : 'bg-[var(--color-bg-panel)] border-[var(--color-border-dim)] text-[var(--color-text-dim)]';
  const chipClass = `px-1.5 py-0.5 border-2 text-[8px] uppercase tracking-[0.2em] font-bold tabular-nums ${toneClass}`;
  // The chip's short label needs its tooltip to read the full effect/numbers —
  // hover-locked text is invisible on touch, so make it tap-toggleable too.
  if (title) {
    return (
      <TouchTooltip label={`${text}: ${title}`} content={title} className={chipClass}>
        {text}
      </TouchTooltip>
    );
  }
  return <span className={chipClass}>{text}</span>;
}

function BlessingBadge({
  name,
  effect,
  god,
  runValue,
}: {
  name: string;
  effect: string;
  god: Blessing['god'];
  /** Resolved per-run total for this run (e.g. "+4 temp HP"), or null when the
   *  effect is a fixed number with nothing to compute. */
  runValue: string | null;
}) {
  // Each blessing carries its OWN tooltip — hover on desktop, tap on touch
  // (prior validation flagged title= as touch-inaccessible), focus for
  // keyboard. The panel shows only this blessing's name + effect, never the
  // whole concatenated strip. Run-scaling blessings lead with the COMPUTED
  // total for this run; the formula stays as the secondary line.
  const label = runValue ? `${name} — ${runValue}` : `${name} — ${effect}`;
  return (
    <TouchTooltip
      label={label}
      className="inline-flex items-center justify-center w-4 h-4 border border-[var(--color-accent-gold)] bg-[var(--color-bg-elevated)] text-[var(--color-accent-amber)] text-[10px] leading-none cursor-help"
      content={
        <>
          <span className="block text-[var(--color-accent-amber)] font-bold text-[11px] leading-tight">
            {name}
          </span>
          {runValue && (
            <span className="block mt-0.5 text-[var(--color-accent-gold)] font-bold text-[10px] leading-snug tabular-nums">
              {t('combat.hud.thisRun', { value: runValue })}
            </span>
          )}
          <span className="block mt-0.5 text-[var(--color-text-secondary)] text-[10px] leading-snug">
            {effect}
          </span>
        </>
      }
    >
      {BLESSING_GOD_GLYPH[god]}
    </TouchTooltip>
  );
}

export function CombatHUD({ character, state, onToggleShieldAutoFire }: CombatHUDProps) {
  const { tc } = useT();
  const ac = computeAC(character);
  const critBand = critRange(character);
  // Surface the player's LIVE crit window — the stacked Champion + blessing +
  // upgrade + affix + boon range — whenever it widens past the default 20-only,
  // so they read their ACTUAL range here instead of a blessing's static "e.g."
  // example. critBand[0] is the low end (e.g. 15 → a natural 15-20 crits).
  const critRangeText = critBand.length > 1 ? `${critBand[0]}–20` : null;

  const isFighter = character.classId === 'fighter';
  const isRogue = character.classId === 'rogue';
  const isWizard = character.classId === 'wizard';
  const isBarbarian = character.classId === 'barbarian';
  const isRanger = character.classId === 'ranger';
  const isMonk = character.classId === 'monk';

  // --- Barbarian resources ---
  const rageRounds = character.resources.rageRoundsRemaining ?? 0;
  const raging = rageRounds > 0;
  const rageUnlimited = isRageUnlimited(character);
  const rageCharges = character.resources.rageChargesRemaining ?? 0;
  const rageChargesCap = rageChargesMax(character);
  const reckless = character.recklessActive === true;

  // --- Ranger resources ---
  const markId = state.huntersMarkTargetId;
  const markTarget =
    markId != null
      ? state.combatants.find(
          (c) => c.kind === 'monster' && c.id === markId && c.instance.hp.current > 0,
        )
      : undefined;
  const markName =
    markTarget && markTarget.kind === 'monster' ? markTarget.instance.displayName : null;

  // --- Fighter resources ---
  const secondWindAvailable = character.resources.secondWindAvailable === true;
  const secondWindBonus = character.resources.secondWindBonusRemaining ?? 0;
  const surgeMax = fighterActionSurgeMax(character.level);
  const surgeRemaining = character.resources.actionSurgeRemaining ?? 0;

  // --- Martial resource pool (Fighter Resolve / Barbarian Fury / Ranger Focus) ---
  const martial = martialFlavor(character);
  const martialPoints = martialPointsLeft(character);
  const martialMax = martialPoolMax(character);
  const offenseUp = character.martialOffenseActive === true;
  const disruptArmed = character.martialDisruptActive === true;

  // --- Monk resources (Ki) ---
  const kiMax = monkKiMax(character);
  const kiNow = character.resources.kiPointsRemaining ?? 0;

  // --- Rogue resources ---
  const cunningMax = rogueCunningActionMax(character);
  const cunningRemaining = character.resources.cunningActionUsesRemaining ?? 0;
  const cunningRegenPending =
    isRogue && state.status === 'active' && cunningRemaining < cunningMax;
  const cunningRegenIn = turnsUntilCunningRegen(state.round);
  const hasUncannyDodge = isRogue && character.level >= UNCANNY_DODGE_LEVEL;
  const uncannyReady = hasUncannyDodge && !character.actionEconomy.reactionUsed;
  const hasNimbleDodge = isRogue && character.level <= NIMBLE_DODGE_MAX_LEVEL;
  const nimbleReady = hasNimbleDodge && !character.actionEconomy.reactionUsed;
  // Fighter Guard (L1-4): the passive first-hit cushion, auto-spent like the
  // rogue's dodges. It rides the same reaction flag, so it reads Ready/Used the
  // same way — no button, just a status the new player can watch work.
  const hasGuard = isFighter && character.level <= GUARD_MAX_LEVEL;
  const guardReady = hasGuard && !character.actionEconomy.reactionUsed;
  const sneakUsed = state.sneakAttackUsedThisTurn === true;
  const hasBloodiedLiveTarget = state.combatants.some((c) => {
    if (c.kind !== 'monster') return false;
    const hp = c.instance.hp;
    return hp.current > 0 && hp.current <= hp.max * BLOODIED_RATIO;
  });
  const sneakArmed =
    isRogue &&
    !sneakUsed &&
    (character.nextAttackAdvantage === true || hasBloodiedLiveTarget);

  // --- Wizard resources ---
  const slotsMax = isWizard ? wizardSpellSlotsForLevel(character.level) : null;
  const slotsNow = character.resources.spellSlots ?? {};
  const wizardBuffs = isWizard
    ? [
        character.resources.mageArmorActive ? 'Mage Armor' : null,
        character.resources.shieldActive ? 'Shield' : null,
        character.resources.mistyStepActive ? 'Misty Step' : null,
      ].filter((b): b is string => b !== null)
    : [];
  const shieldAutoFire = character.resources.shieldAutoFire !== false;
  const hasShield = isWizard && character.resources.knownSpells?.includes('shield') === true;

  // --- Active blessings (resolve glyphs + tooltips) ---
  interface BlessingEntry {
    id: string;
    name: string;
    god: Blessing['god'];
    effect: string;
    runValue: string | null;
  }
  const blessingEntries: BlessingEntry[] = [];
  for (const id of character.blessings) {
    try {
      const b = getBlessing(id);
      blessingEntries.push({
        id,
        name: b.name,
        god: b.god,
        effect: b.effect,
        runValue: resolveBlessingRunValue(b.modifiers, character),
      });
    } catch {
      // Unknown blessing id — skip rather than crash the HUD.
    }
  }
  // --- Status conditions (skip duration noise — just the names) ---
  const conditions = character.conditions;

  // --- Boss-intel edge (readied in the pre-boss room; spent this fight) ---
  // Surfaced only when a monster in this encounter is the very boss the edge
  // was readied against. "Set" while the opener advantage is still live,
  // "Spent" once it has been struck — honest, like the Sneak/Reaction pills.
  const bossEdge = (() => {
    const intel = character.bossIntel;
    if (!intel) return null;
    for (const c of state.combatants) {
      if (c.kind !== 'monster') continue;
      const tier = intel[c.instance.defId];
      if (!tier) continue;
      const buff = bossIntelBuffFor(c.instance.defId, tier, character.classId);
      if (!buff) continue;
      const live =
        (buff.firstStrikeAdvantage && character.nextAttackAdvantage === true) ||
        (buff.bracedSave && character.nextSaveAdvantage === true);
      return { buff, bossName: c.instance.displayName, live };
    }
    return null;
  })();

  const hpPct = character.hp.max > 0 ? character.hp.current / character.hp.max : 0;
  const hpTone =
    hpPct <= 0.25
      ? 'text-[var(--color-accent-blood)]'
      : hpPct <= 0.5
        ? 'text-[var(--color-accent-amber)]'
        : 'text-[var(--color-text-primary)]';

  return (
    <div
      className="flex flex-wrap items-stretch border-2 border-[var(--color-border-warm)] bg-[var(--color-bg-panel)] text-[10px] uppercase tracking-[0.18em]"
      style={{ minHeight: '40px' }}
      aria-label={t('combat.hud.label')}
    >
      <Section title={t('combat.hud.vitals')}>
        <div className="flex flex-col gap-1 min-w-[150px]">
          <div className="flex items-center justify-between gap-3">
            <span
              className={`tabular-nums font-bold ${hpTone}`}
              title={character.hp.temp > 0 ? t('combat.hud.hpTitleTemp', { n: character.hp.temp }) : t('combat.hud.hpTitle')}
            >
              {t('combat.hud.hp')} {character.hp.current}/{character.hp.max}
              {character.hp.temp > 0 && (
                <span className="ml-1 text-[var(--color-accent-gold)]">+{character.hp.temp}</span>
              )}
            </span>
            <span className="flex items-center gap-2.5">
              <span
                className="tabular-nums text-[var(--color-text-secondary)]"
                title={t('combat.hud.acTitle')}
              >
                {t('combat.hud.ac')} {ac}
              </span>
            </span>
          </div>
          <HpBar current={character.hp.current} max={character.hp.max} temp={character.hp.temp} />
        </div>
      </Section>

      {critRangeText && (
        <Section title={t('combat.hud.crit')}>
          <Pill
            text={t('combat.hud.critPill', { range: critRangeText })}
            on
            tone="amber"
            title={t('combat.hud.critTitle', { range: critRangeText })}
          />
        </Section>
      )}

      {bossEdge && (
        <Section title={bossEdge.buff.label}>
          <Pill
            text={bossEdge.live ? t('combat.hud.set') : t('combat.hud.spent')}
            on={bossEdge.live}
            tone="amber"
            title={t('combat.hud.bossEdgeTitle', { desc: bossEdge.buff.description, boss: bossEdge.bossName })}
          />
        </Section>
      )}

      {isFighter && (
        <Section title={t('combat.hud.secondWind')}>
          <Dot
            on={secondWindAvailable}
            title={secondWindAvailable ? t('combat.hud.secondWindReady') : t('combat.hud.secondWindSpent')}
          />
          {Array.from({ length: secondWindBonus }).map((_, i) => (
            <Dot key={`sw-bonus-${i}`} on title={t('combat.hud.wellspringBonus')} />
          ))}
        </Section>
      )}

      {isFighter && surgeMax > 0 && (
        <Section title={t('combat.hud.actionSurge')}>
          {Array.from({ length: surgeMax }).map((_, i) => (
            <Dot
              key={`as-${i}`}
              on={i < surgeRemaining}
              title={i < surgeRemaining ? t('combat.hud.actionSurgeReady') : t('combat.hud.actionSurgeSpent')}
            />
          ))}
        </Section>
      )}

      {martial && (
        <Section title={martial.pool}>
          {Array.from({ length: martialMax }).map((_, i) => (
            <Dot
              key={`mp-${i}`}
              on={i < martialPoints}
              title={
                i < martialPoints
                  ? t('combat.hud.poolReady', { pool: martial.pool, offense: martial.offense, defense: martial.defense, disrupt: martial.disrupt })
                  : t('combat.hud.poolSpent', { pool: martial.pool })
              }
            />
          ))}
          {offenseUp && (
            <Pill
              text={t('combat.hud.heavy')}
              on
              tone="amber"
              title={t('combat.hud.offenseSet', { offense: martial.offense })}
            />
          )}
          {disruptArmed && (
            <Pill
              text={t('combat.hud.armed')}
              on
              tone="amber"
              title={t('combat.hud.disruptArmed', { disrupt: martial.disrupt })}
            />
          )}
        </Section>
      )}

      {isMonk && kiMax > 0 && (
        <Section title={t('combat.hud.ki')}>
          {/* Ki = monk level, so a capstone monk carries 20+ pips — wrap them
              (like the blessing strip) so the well never overflows the bar on a
              narrow phone instead of marching off the edge. */}
          <div className="flex flex-wrap items-center gap-1.5 max-w-[150px]">
            {Array.from({ length: kiMax }).map((_, i) => (
              <Dot
                key={`ki-${i}`}
                on={i < kiNow}
                title={i < kiNow ? t('combat.hud.kiReady') : t('combat.hud.kiSpent')}
              />
            ))}
          </div>
        </Section>
      )}

      {isRogue && (
        <Section title={t('combat.hud.cunningAction')}>
          {Array.from({ length: Math.max(cunningMax, cunningRemaining) }).map((_, i) => (
            <Dot
              key={`ca-${i}`}
              on={i < cunningRemaining}
              title={i < cunningRemaining ? t('combat.hud.cunningReady') : t('combat.hud.cunningSpent')}
            />
          ))}
          {cunningRegenPending && (
            <Pill
              text={t('combat.hud.cunningRegenPill', { n: cunningRegenIn })}
              on={false}
              tone="amber"
              title={cunningRegenIn === 1 ? t('combat.hud.cunningRegenOne', { n: cunningRegenIn }) : t('combat.hud.cunningRegenMany', { n: cunningRegenIn })}
            />
          )}
        </Section>
      )}

      {isRogue && (
        <Section title={t('combat.hud.sneak')}>
          <Pill
            text={sneakArmed ? t('combat.hud.sneakArmed') : sneakUsed ? t('combat.hud.sneakSpent') : t('combat.hud.sneakIdle')}
            on={sneakArmed}
            tone="amber"
            title={
              sneakUsed
                ? t('combat.hud.sneakUsedTitle')
                : sneakArmed
                  ? character.nextAttackAdvantage
                    ? t('combat.hud.sneakAdvTitle')
                    : t('combat.hud.sneakBloodiedTitle')
                  : t('combat.hud.sneakNeedTitle')
            }
          />
        </Section>
      )}

      {hasUncannyDodge && (
        <Section title={t('combat.hud.reaction')}>
          <Pill
            text={uncannyReady ? t('combat.hud.udReady') : t('combat.hud.udUsed')}
            on={uncannyReady}
            tone="gold"
            title={uncannyReady ? t('combat.hud.udReadyTitle') : t('combat.hud.udUsedTitle')}
          />
        </Section>
      )}

      {hasNimbleDodge && (
        <Section title={t('combat.hud.reaction')}>
          <Pill
            text={nimbleReady ? t('combat.hud.nimbleReady') : t('combat.hud.nimbleUsed')}
            on={nimbleReady}
            tone="gold"
            title={nimbleReady ? t('combat.hud.nimbleReadyTitle') : t('combat.hud.nimbleUsedTitle')}
          />
        </Section>
      )}

      {hasGuard && (
        <Section title={t('combat.hud.reaction')}>
          <Pill
            text={guardReady ? t('combat.hud.guardReady') : t('combat.hud.guardUsed')}
            on={guardReady}
            tone="gold"
            title={guardReady ? t('combat.hud.guardReadyTitle') : t('combat.hud.guardUsedTitle')}
          />
        </Section>
      )}

      {hasShield && (
        <Section title={t('combat.hud.reaction')}>
          <button
            type="button"
            onClick={onToggleShieldAutoFire}
            disabled={!onToggleShieldAutoFire}
            title={shieldAutoFire ? t('combat.hud.shieldOnTitle') : t('combat.hud.shieldOffTitle')}
            className={`px-1.5 py-0.5 border-2 text-[8px] uppercase tracking-[0.2em] font-bold tabular-nums cursor-pointer ${
              shieldAutoFire
                ? 'bg-[var(--color-bg-panel)] border-[var(--color-accent-gold)] text-[var(--color-accent-amber)]'
                : 'bg-[var(--color-bg-panel)] border-[var(--color-border-dim)] text-[var(--color-text-dim)]'
            }`}
          >
            {t('combat.hud.shield')} {shieldAutoFire ? t('combat.hud.shieldAuto') : t('combat.hud.shieldOff')}
          </button>
        </Section>
      )}

      {isBarbarian && (
        <Section title={t('combat.hud.rage')}>
          <div className="flex flex-wrap items-center gap-1.5 max-w-[150px]">
            {rageUnlimited ? (
              <Pill
                text="∞"
                on
                tone="blood"
                title={t('combat.hud.rageUnlimitedTitle')}
              />
            ) : (
              Array.from({ length: Math.max(rageChargesCap, rageCharges) }).map((_, i) => (
                <Dot
                  key={`rage-${i}`}
                  on={i < rageCharges}
                  title={i < rageCharges ? t('combat.hud.rageChargeReady') : t('combat.hud.rageChargeSpent')}
                />
              ))
            )}
            {raging && (
              <Pill
                text={t('combat.hud.furyPill', { n: rageRounds })}
                on
                tone="blood"
                title={rageRounds === 1 ? t('combat.hud.ragingTitleOne', { n: rageRounds }) : t('combat.hud.ragingTitleMany', { n: rageRounds })}
              />
            )}
          </div>
        </Section>
      )}

      {reckless && (
        <Section title={t('combat.hud.stance')}>
          <Pill
            text={t('combat.hud.reckless')}
            on
            tone="blood"
            title={t('combat.hud.recklessTitle')}
          />
        </Section>
      )}

      {isRanger && (
        <Section title={t('combat.hud.quarry')}>
          <Pill
            text={markName ?? t('combat.hud.unmarked')}
            on={markName != null}
            tone="amber"
            title={markName ? t('combat.hud.quarryTitle', { name: markName }) : t('combat.hud.quarryNoneTitle')}
          />
        </Section>
      )}

      {isWizard && slotsMax && (
        <>
          {([1, 2, 3, 4, 5, 6, 7, 8, 9] as const).map((lvl) => {
            const max = slotsMax[lvl] ?? 0;
            if (max <= 0) return null;
            const now = slotsNow[lvl] ?? 0;
            return (
              <Section key={`slot-${lvl}`} title={t('combat.hud.slot', { lvl })}>
                {Array.from({ length: max }).map((_, i) => (
                  <Dot
                    key={`slot-${lvl}-${i}`}
                    on={i < now}
                    title={i < now ? t('combat.hud.slotAvailable', { lvl }) : t('combat.hud.slotSpent', { lvl })}
                  />
                ))}
              </Section>
            );
          })}
          <Section title={t('combat.hud.cast')}>
            <span
              className="tabular-nums text-[var(--color-accent-amber)]"
              title={t('combat.hud.spellAtkTitle')}
            >
              {t('combat.hud.atk')} {spellAttackBonus(character) >= 0 ? '+' : ''}
              {spellAttackBonus(character)}
            </span>
            <span
              className="tabular-nums text-[var(--color-accent-amber)]"
              title={t('combat.hud.spellDcTitle')}
            >
              {t('combat.hud.dc')} {spellSaveDC(character)}
            </span>
          </Section>
        </>
      )}

      {wizardBuffs.length > 0 && (
        <Section title={t('combat.hud.buffs')}>
          {wizardBuffs.map((b) => (
            <Pill key={b} text={wizardBuffName(b)} on tone="gold" title={wizardBuffDescription(b)} />
          ))}
        </Section>
      )}

      {blessingEntries.length > 0 && (
        <Section title={t('combat.hud.blessings')}>
          {/* Each blessing is its own badge wearing its god's mark, with its own
              hover/tap tooltip — never the whole strip concatenated. Wrap to a
              second row only when the marks run out of horizontal room. */}
          <div className="flex flex-wrap items-center gap-1 max-w-[220px]">
            {blessingEntries.map((b) => (
              <BlessingBadge
                key={b.id}
                name={tc('blessings', b.id, 'name', b.name)}
                effect={tc('blessings', b.id, 'effect', b.effect)}
                god={b.god}
                runValue={b.runValue}
              />
            ))}
          </div>
        </Section>
      )}

      {conditions.length > 0 && (
        <Section title={t('combat.hud.status')}>
          {conditions.map((c, i) => {
            const condName = t(`combat.cond.name.${c.name}`);
            return (
              <span
                key={`${c.name}-${i}`}
                title={condName}
                aria-label={condName}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 border-2 bg-[var(--color-accent-deep-blood)] border-[var(--color-accent-blood)] text-[var(--color-text-primary)] text-[9px]"
              >
                <span>{conditionGlyph(c.name)}</span>
                <span className="uppercase tracking-[0.15em]">{condName}</span>
              </span>
            );
          })}
        </Section>
      )}
    </div>
  );
}
