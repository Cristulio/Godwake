import type { Item, RolledItem } from '../../schemas/item';
import type { Rarity } from '../../schemas/ids';
import { getAffix } from '../../content/items';
import { getSetPiece, getGearSet } from '../../content/sets';
import { weaponStatRequirement } from '../../engine/character/equip';
import { GEAR_RARITY_COLOR } from './rarity';
import {
  localizedItemName,
  itemKindLabel,
  gearRarityLabel,
  dndRarityLabel,
  localizedDamageType,
  weaponPropertyLabel,
  twoHandedPremiumLine,
  twoHandedScaledTag,
} from './itemDisplay';
import { affixRelevanceById } from './affixRelevance';
import { useGameStore } from '../../stores/gameStore';
import { useT } from '../../i18n/useT';

type TFn = (key: string, params?: Record<string, string | number>) => string;

interface ItemTooltipProps {
  item: Item;
  /** Show the click-to-act hint at the bottom (e.g. "Click to equip"). */
  hint?: string;
  /** Present for rolled loot — drives the name, rarity colour, and affix list. */
  rolled?: RolledItem;
  /** Override the displayed value (gp) — use the rolled premium price, not base.cost. */
  rolledCost?: number;
  /** Caveat shown when this class dons this armour (Barbarian rage-break, agile suppression). */
  equipWarning?: string;
}

const RARITY_COLOR: Record<Rarity, string> = {
  common: 'var(--color-text-secondary)',
  uncommon: 'var(--color-status-poison)',
  rare: 'var(--color-status-frost)',
  'very-rare': 'var(--color-accent-amber)',
  legendary: 'var(--color-accent-gold)',
  artifact: 'var(--color-accent-blood)',
};

export function ItemTooltip({ item, hint, rolled, rolledCost, equipWarning }: ItemTooltipProps) {
  const { t, tc } = useT();
  const character = useGameStore((s) => s.character);
  const isRolled = rolled !== undefined && rolled.rarity !== 'white';
  const borderColor = isRolled ? GEAR_RARITY_COLOR[rolled.rarity] : 'var(--color-accent-amber)';
  const displayName = localizedItemName({ itemId: item.id, rolled });
  return (
    <div
      role="tooltip"
      className="w-64 max-w-[calc(100vw-1.5rem)] bg-[var(--color-bg-panel)] border-2 p-3 shadow-[0_4px_16px_rgba(0,0,0,0.6)] pointer-events-none select-none"
      style={{ borderColor }}
    >
      <div className="text-[var(--color-text-primary)] font-bold uppercase tracking-wider text-sm leading-tight">
        {displayName}
      </div>
      <div
        className="text-[10px] uppercase tracking-widest mt-0.5"
        style={{ color: isRolled ? GEAR_RARITY_COLOR[rolled.rarity] : RARITY_COLOR[item.rarity] }}
      >
        {itemKindLabel(item)} · {isRolled ? gearRarityLabel(rolled.rarity) : dndRarityLabel(item.rarity)}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] font-mono">
        {renderStats(item, t, rolledCost, rolled)}
      </div>

      {isRolled && rolled.rarity === 'set' && (() => {
        const piece = getSetPiece(item.id);
        if (!piece) return null;
        return (
          <div className="mt-2 pt-2 border-t border-[var(--color-border-dim)] space-y-0.5">
            <div className="text-[10px] leading-snug" style={{ color: GEAR_RARITY_COLOR.set }}>
              ◆ {tc('setGear', item.id, 'effect', piece.effectLine)}
            </div>
            <div className="text-[9px] uppercase tracking-widest" style={{ color: GEAR_RARITY_COLOR.set }}>
              {tc('setGear', piece.setId, 'name', getGearSet(piece.setId)?.name ?? '')}
            </div>
          </div>
        );
      })()}

      {isRolled && rolled.affixes.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[var(--color-border-dim)] space-y-0.5">
          {rolled.affixes.map((id) => {
            let effect = id;
            try {
              effect = tc('items', id, 'effect', getAffix(id).effect);
            } catch {
              /* unknown affix id — show the raw id */
            }
            const rel = affixRelevanceById(id, character);
            const scaled = twoHandedScaledTag(id, item);
            return (
              <div
                key={id}
                className="text-[10px] leading-snug"
                style={{ color: GEAR_RARITY_COLOR[rolled.rarity], opacity: rel.relevant ? 1 : 0.4 }}
              >
                ◆ {effect}
                {scaled && (
                  <span className="ml-1 font-mono not-italic text-[var(--color-accent-amber)]">→ {scaled}</span>
                )}
                {rel.tag && (
                  <span className="ml-1 not-italic text-[9px] uppercase tracking-wider text-[var(--color-text-dim)]">
                    ({rel.tag})
                  </span>
                )}
              </div>
            );
          })}
          {twoHandedPremiumLine(item, rolled) && (
            <div className="text-[10px] leading-snug text-[var(--color-accent-amber)]">
              ◆ {twoHandedPremiumLine(item, rolled)}
            </div>
          )}
        </div>
      )}

      {equipWarning && (
        <div className="mt-2 pt-2 border-t border-[var(--color-border-dim)]">
          <div className="text-[10px] leading-snug text-[var(--color-accent-amber)]">
            ⚠ {equipWarning}
          </div>
        </div>
      )}

      {item.description && (
        <p className="text-[var(--color-text-secondary)] text-xs italic mt-2 leading-snug">
          {tc('items', item.id, 'description', item.description)}
        </p>
      )}

      {hint && (
        <div className="text-[var(--color-accent-amber)] text-[10px] uppercase tracking-widest mt-2 pt-2 border-t border-[var(--color-border-dim)]">
          {hint}
        </div>
      )}
    </div>
  );
}

function renderStats(item: Item, t: TFn, rolledCost?: number, rolled?: RolledItem) {
  const rows: Array<[string, string]> = [];
  const enh = rolled?.enhancement ?? 0;
  const plus = enh > 0 ? ` +${enh}` : '';
  if (item.kind === 'weapon') {
    rows.push([t('screens.itemTooltip.stat.damage'), `${item.damage}${plus} ${localizedDamageType(item.damageType)}`]);
    if (item.versatileDamage) rows.push([t('screens.itemTooltip.stat.versatile'), `${item.versatileDamage}${plus}`]);
    if (enh > 0) rows.push([t('screens.itemTooltip.stat.enhancement'), t('screens.itemTooltip.hitDmg', { n: enh })]);
    if (item.range) rows.push([t('screens.itemTooltip.stat.range'), t('screens.itemTooltip.ft', { a: item.range[0], b: item.range[1] })]);
    const displayProps = item.properties.filter((p) => p !== 'special');
    if (displayProps.length > 0) {
      rows.push([t('screens.itemTooltip.stat.properties'), displayProps.map(weaponPropertyLabel).join(', ')]);
    }
    const req = weaponStatRequirement(item);
    if (req) rows.push([t('screens.itemTooltip.stat.req'), `${req.ability.toUpperCase()} ${req.value}`]);
  } else if (item.kind === 'armor') {
    if (item.category === 'shield') {
      rows.push([t('screens.itemTooltip.stat.acBonus'), `+${item.baseAC + enh}`]);
    } else if (item.category === 'robe') {
      rows.push([t('screens.itemTooltip.stat.armour'), t('screens.itemTooltip.noneCaster')]);
    } else if (item.category === 'orb') {
      // An orb is a caster focus with no armour value — show that, not "Base AC: 0".
      rows.push([t('screens.itemTooltip.stat.armour'), t('screens.itemTooltip.orbNoAc')]);
    } else {
      rows.push([t('screens.itemTooltip.stat.baseAc'), String(item.baseAC + enh)]);
      if (enh > 0) rows.push([t('screens.itemTooltip.stat.enhancement'), t('screens.itemTooltip.enhAc', { n: enh })]);
    }
    if (item.strRequirement) rows.push([t('screens.itemTooltip.stat.strReq'), String(item.strRequirement)]);
  } else if (item.kind === 'consumable') {
    rows.push([
      t('screens.itemTooltip.stat.action'),
      item.actionCost === 'bonus' ? t('screens.itemTooltip.actionBonus') : t('screens.itemTooltip.actionAction'),
    ]);
    if (item.healDice) rows.push([t('screens.itemTooltip.stat.heal'), item.healDice]);
  }
  rows.push([t('screens.itemTooltip.stat.value'), t('screens.itemTooltip.gp', { n: rolledCost ?? item.cost })]);

  return rows.map(([label, value]) => (
    <div key={label} className="contents">
      <span className="text-[var(--color-text-dim)] uppercase tracking-wider">{label}</span>
      <span className="text-[var(--color-text-primary)] text-right">{value}</span>
    </div>
  ));
}
