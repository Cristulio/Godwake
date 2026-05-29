import type { ReactNode } from 'react';
import type { Character } from '../../types/character';
import type { CombatState } from '../../types/combat';
import { computeAC, characterHasMechanic } from '../../engine/character/derived';
import { getRace } from '../../content/races';
import {
  rogueCunningActionMax,
  wizardSpellSlotsForLevel,
  barbarianRageMax,
} from '../../engine/character/actions';
import { spellAttackBonus, spellSaveDC } from '../../engine/combat/spells';
import { getBlessing } from '../../content/blessings';
import type { Blessing } from '../../schemas/blessing';

const UNCANNY_DODGE_LEVEL = 5;
const BLOODIED_RATIO = 0.5;

interface CombatHUDProps {
  character: Character;
  state: CombatState;
}

function fighterActionSurgeMax(level: number): number {
  if (level >= 17) return 2;
  if (level >= 2) return 1;
  return 0;
}

function blessingGlyph(god: Blessing['god']): string {
  // Single-character marks per god — readable at 14px without needing a sprite.
  switch (god) {
    case 'tymora': return '◉';
    case 'helm': return '⛨';
    case 'tempus': return '⚔';
    case 'mystra': return '✦';
    case 'lathander': return '☀';
    case 'selune': return '☾';
    case 'ilmater': return '✚';
    case 'silvanus': return '❦';
    default: return '✧';
  }
}

function conditionGlyph(name: string): string {
  switch (name) {
    case 'paralyzed': return '⛓';
    case 'prone': return '↓';
    case 'blinded': return '◐';
    case 'poisoned': return '☣';
    case 'frightened': return '!';
    case 'restrained': return '⊠';
    case 'grappled': return '✊';
    case 'stunned': return '✦';
    case 'incapacitated': return '⊘';
    case 'charmed': return '♥';
    case 'unconscious': return 'z';
    case 'exhausted': return '⊝';
    default: return '◇';
  }
}

function wizardBuffDescription(name: string): string {
  // Tooltips describe the mechanical effect, not just "active". Numbers mirror
  // the wizard-buff branch in computeAC (Mage Armor +3 over the 10+DEX base =
  // 13+DEX while unarmored; Shield +5; Misty Step +2).
  switch (name) {
    case 'Mage Armor':
      return 'Mage Armor — base AC becomes 13 + DEX while unarmored.';
    case 'Shield':
      return 'Shield — +5 AC against incoming attacks until your next turn.';
    case 'Misty Step':
      return 'Misty Step — +2 AC until your next turn.';
    default:
      return `${name} active`;
  }
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
  return (
    <span
      title={title}
      aria-label={title}
      className={`px-1.5 py-0.5 border-2 text-[8px] uppercase tracking-[0.2em] font-bold tabular-nums ${toneClass}`}
    >
      {text}
    </span>
  );
}

export function CombatHUD({ character, state }: CombatHUDProps) {
  const ac = computeAC(character);
  const race = getRace(character.raceId);
  const speed = race.speed;

  const isFighter = character.classId === 'fighter';
  const isRogue = character.classId === 'rogue';
  const isWizard = character.classId === 'wizard';
  const isBarbarian = character.classId === 'barbarian';
  const isRanger = character.classId === 'ranger';

  // --- Barbarian resources ---
  const rageMax = barbarianRageMax(character);
  const rageUses = character.resources.rageUsesRemaining ?? 0;
  const rageRounds = character.resources.rageRoundsRemaining ?? 0;
  const raging = rageRounds > 0;
  const hasReckless = isBarbarian && characterHasMechanic(character, 'reckless-attack');
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

  // --- Rogue resources ---
  const cunningMax = rogueCunningActionMax(character);
  const cunningRemaining = character.resources.cunningActionUsesRemaining ?? 0;
  const hasUncannyDodge = isRogue && character.level >= UNCANNY_DODGE_LEVEL;
  const uncannyReady = hasUncannyDodge && !character.actionEconomy.reactionUsed;
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

  // --- Active blessings (resolve glyphs + tooltips) ---
  interface BlessingEntry {
    id: string;
    name: string;
    god: Blessing['god'];
    effect: string;
  }
  const blessingEntries: BlessingEntry[] = [];
  for (const id of character.blessings) {
    try {
      const b = getBlessing(id);
      blessingEntries.push({ id, name: b.name, god: b.god, effect: b.effect });
    } catch {
      // Unknown blessing id — skip rather than crash the HUD.
    }
  }
  // --- Status conditions (skip duration noise — just the names) ---
  const conditions = character.conditions;

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
      aria-label="Combat HUD"
    >
      <Section title="Vitals">
        <div className="flex flex-col gap-1 min-w-[150px]">
          <div className="flex items-center justify-between gap-3">
            <span
              className={`tabular-nums font-bold ${hpTone}`}
              title={`Hit points${character.hp.temp > 0 ? ` (+${character.hp.temp} temp)` : ''}`}
            >
              HP {character.hp.current}/{character.hp.max}
              {character.hp.temp > 0 && (
                <span className="ml-1 text-[var(--color-accent-gold)]">+{character.hp.temp}</span>
              )}
            </span>
            <span className="flex items-center gap-2.5">
              <span
                className="tabular-nums text-[var(--color-text-secondary)]"
                title="Armor Class"
              >
                AC {ac}
              </span>
              <span
                className="tabular-nums text-[var(--color-text-dim)]"
                title="Speed (ft per turn)"
              >
                SPD {speed}
              </span>
            </span>
          </div>
          <HpBar current={character.hp.current} max={character.hp.max} temp={character.hp.temp} />
        </div>
      </Section>

      {isFighter && (
        <Section title="Second Wind">
          <Dot
            on={secondWindAvailable}
            title={secondWindAvailable ? 'Second Wind ready' : 'Second Wind spent'}
          />
          {Array.from({ length: secondWindBonus }).map((_, i) => (
            <Dot key={`sw-bonus-${i}`} on title="Wellspring Vigil bonus charge" />
          ))}
        </Section>
      )}

      {isFighter && surgeMax > 0 && (
        <Section title="Action Surge">
          {Array.from({ length: surgeMax }).map((_, i) => (
            <Dot
              key={`as-${i}`}
              on={i < surgeRemaining}
              title={i < surgeRemaining ? 'Action Surge available' : 'Action Surge spent'}
            />
          ))}
        </Section>
      )}

      {isRogue && (
        <Section title="Cunning Action">
          {Array.from({ length: Math.max(cunningMax, cunningRemaining) }).map((_, i) => (
            <Dot
              key={`ca-${i}`}
              on={i < cunningRemaining}
              title={i < cunningRemaining ? 'Cunning Action available' : 'Cunning Action spent'}
            />
          ))}
        </Section>
      )}

      {isRogue && (
        <Section title="Sneak">
          <Pill
            text={sneakArmed ? 'Armed' : sneakUsed ? 'Spent' : 'Idle'}
            on={sneakArmed}
            tone="amber"
            title={
              sneakUsed
                ? 'Sneak Attack already fired this turn.'
                : sneakArmed
                  ? character.nextAttackAdvantage
                    ? 'Sneak Attack will trigger — you have advantage on your next attack.'
                    : 'Sneak Attack will trigger — a target is bloodied.'
                  : 'Sneak Attack needs advantage (Hide) or a bloodied target.'
            }
          />
        </Section>
      )}

      {hasUncannyDodge && (
        <Section title="Reaction">
          <Pill
            text={uncannyReady ? 'UD Ready' : 'UD Used'}
            on={uncannyReady}
            tone="gold"
            title={
              uncannyReady
                ? 'Uncanny Dodge: halves the first hit you take this round.'
                : 'Uncanny Dodge already used this round — resets at end of turn.'
            }
          />
        </Section>
      )}

      {isBarbarian && (
        <Section title="Rage">
          {Array.from({ length: Math.max(rageMax, rageUses) }).map((_, i) => (
            <Dot
              key={`rage-${i}`}
              on={i < rageUses}
              title={i < rageUses ? 'Rage available' : 'Rage spent'}
            />
          ))}
          {raging && (
            <Pill
              text={`Fury ${rageRounds}`}
              on
              tone="blood"
              title={`Raging for ${rageRounds} more round${rageRounds === 1 ? '' : 's'} — physical damage halved, melee hits land harder.`}
            />
          )}
        </Section>
      )}

      {hasReckless && (
        <Section title="Stance">
          <Pill
            text={reckless ? 'Reckless' : 'Guarded'}
            on={reckless}
            tone="blood"
            title={
              reckless
                ? 'Fighting recklessly — your melee attacks have advantage, and so do attacks against you until your next turn.'
                : 'Guarded — declare Reckless to trade defense for advantage on your swings.'
            }
          />
        </Section>
      )}

      {isRanger && (
        <Section title="Quarry">
          <Pill
            text={markName ?? 'Unmarked'}
            on={markName != null}
            tone="amber"
            title={
              markName
                ? `Hunter's Mark rides ${markName} — every hit on it bites deeper.`
                : "No quarry marked — Hunter's Mark adds bonus damage to a branded target."
            }
          />
        </Section>
      )}

      {isWizard && slotsMax && (
        <>
          {([1, 2, 3] as const).map((lvl) => {
            const max = slotsMax[lvl] ?? 0;
            if (max <= 0) return null;
            const now = slotsNow[lvl] ?? 0;
            return (
              <Section key={`slot-${lvl}`} title={`Slot ${lvl}`}>
                {Array.from({ length: max }).map((_, i) => (
                  <Dot
                    key={`slot-${lvl}-${i}`}
                    on={i < now}
                    title={i < now ? `Level ${lvl} slot available` : `Level ${lvl} slot spent`}
                  />
                ))}
              </Section>
            );
          })}
          <Section title="Cast">
            <span
              className="tabular-nums text-[var(--color-accent-amber)]"
              title="Spell attack bonus"
            >
              ATK {spellAttackBonus(character) >= 0 ? '+' : ''}
              {spellAttackBonus(character)}
            </span>
            <span
              className="tabular-nums text-[var(--color-accent-amber)]"
              title="Spell save DC enemies roll against"
            >
              DC {spellSaveDC(character)}
            </span>
          </Section>
        </>
      )}

      {wizardBuffs.length > 0 && (
        <Section title="Buffs">
          {wizardBuffs.map((b) => (
            <Pill key={b} text={b} on tone="gold" title={wizardBuffDescription(b)} />
          ))}
        </Section>
      )}

      {blessingEntries.length > 0 && (
        <Section title="Blessings">
          {/* Show every blessing — each glyph carries its own tooltip. Wrap to a
              second row only when the icons actually run out of horizontal room. */}
          <div className="flex flex-wrap items-center gap-1 max-w-[220px]">
            {blessingEntries.map((b) => (
              <span
                key={b.id}
                title={`${b.name} — ${b.effect}`}
                aria-label={`${b.name} — ${b.effect}`}
                className="inline-flex items-center justify-center w-4 h-4 border border-[var(--color-accent-gold)] bg-[var(--color-bg-elevated)] text-[var(--color-accent-amber)] text-[10px] leading-none"
              >
                {blessingGlyph(b.god)}
              </span>
            ))}
          </div>
        </Section>
      )}

      {conditions.length > 0 && (
        <Section title="Status">
          {conditions.map((c, i) => (
            <span
              key={`${c.name}-${i}`}
              title={c.name}
              aria-label={c.name}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 border-2 bg-[var(--color-accent-deep-blood)] border-[var(--color-accent-blood)] text-[var(--color-text-primary)] text-[9px]"
            >
              <span>{conditionGlyph(c.name)}</span>
              <span className="uppercase tracking-[0.15em]">{c.name}</span>
            </span>
          ))}
        </Section>
      )}
    </div>
  );
}
