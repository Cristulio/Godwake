import type { Item, RolledItem } from '../../schemas/item';
import type { Rarity } from '../../schemas/ids';
import { getAffix } from '../../content/items';
import { weaponStatRequirement } from '../../engine/character/equip';
import { GEAR_RARITY_COLOR, GEAR_RARITY_LABEL } from './rarity';

interface ItemTooltipProps {
  item: Item;
  /** Show the click-to-act hint at the bottom (e.g. "Click to equip"). */
  hint?: string;
  /** Present for rolled loot — drives the name, rarity colour, and affix list. */
  rolled?: RolledItem;
  /** Override the displayed value (gp) — use the rolled premium price, not base.cost. */
  rolledCost?: number;
  /** Non-null when equipping this item suppresses a class's agile perks. */
  agileTradeoffWarning?: string;
}

const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  'very-rare': 'Very Rare',
  legendary: 'Legendary',
  artifact: 'Artifact',
};

const RARITY_COLOR: Record<Rarity, string> = {
  common: 'var(--color-text-secondary)',
  uncommon: 'var(--color-status-poison)',
  rare: 'var(--color-status-frost)',
  'very-rare': 'var(--color-accent-amber)',
  legendary: 'var(--color-accent-gold)',
  artifact: 'var(--color-accent-blood)',
};

export function ItemTooltip({ item, hint, rolled, rolledCost, agileTradeoffWarning }: ItemTooltipProps) {
  const isRolled = rolled !== undefined && rolled.rarity !== 'white';
  const borderColor = isRolled ? GEAR_RARITY_COLOR[rolled.rarity] : 'var(--color-accent-amber)';
  const displayName = rolled?.name ?? item.name;
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
        {kindLabel(item)} · {isRolled ? GEAR_RARITY_LABEL[rolled.rarity] : RARITY_LABEL[item.rarity]}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] font-mono">
        {renderStats(item, rolledCost, rolled)}
      </div>

      {isRolled && rolled.affixes.length > 0 && (
        <div className="mt-2 pt-2 border-t border-[var(--color-border-dim)] space-y-0.5">
          {rolled.affixes.map((id) => {
            let effect = id;
            try {
              effect = getAffix(id).effect;
            } catch {
              /* unknown affix id — show the raw id */
            }
            return (
              <div
                key={id}
                className="text-[10px] leading-snug"
                style={{ color: GEAR_RARITY_COLOR[rolled.rarity] }}
              >
                ◆ {effect}
              </div>
            );
          })}
        </div>
      )}

      {agileTradeoffWarning && (
        <div className="mt-2 pt-2 border-t border-[var(--color-border-dim)]">
          <div className="text-[10px] leading-snug text-[var(--color-accent-amber)]">
            ⚠ {agileTradeoffWarning}
          </div>
        </div>
      )}

      {item.description && (
        <p className="text-[var(--color-text-secondary)] text-xs italic mt-2 leading-snug">
          {item.description}
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

function kindLabel(item: Item): string {
  switch (item.kind) {
    case 'weapon':
      return `${item.category} weapon`;
    case 'armor':
      if (item.category === 'shield') return 'shield';
      if (item.category === 'robe') return 'robe';
      return `${item.category} armor`;
    case 'consumable':
      return `${item.effect} consumable`;
    case 'accessory':
      return `${item.accessorySlot} · accessory`;
  }
}

function renderStats(item: Item, rolledCost?: number, rolled?: RolledItem) {
  const rows: Array<[string, string]> = [];
  const enh = rolled?.enhancement ?? 0;
  const plus = enh > 0 ? ` +${enh}` : '';
  if (item.kind === 'weapon') {
    rows.push(['Damage', `${item.damage}${plus} ${item.damageType}`]);
    if (item.versatileDamage) rows.push(['Versatile', `${item.versatileDamage}${plus}`]);
    if (enh > 0) rows.push(['Enhancement', `+${enh} hit & dmg`]);
    if (item.range) rows.push(['Range', `${item.range[0]}/${item.range[1]} ft`]);
    const displayProps = item.properties.filter((p) => p !== 'special');
    if (displayProps.length > 0) {
      rows.push(['Properties', displayProps.join(', ')]);
    }
    const req = weaponStatRequirement(item);
    if (req) rows.push(['Req', `${req.ability.toUpperCase()} ${req.value}`]);
  } else if (item.kind === 'armor') {
    if (item.category === 'shield') {
      rows.push(['AC bonus', `+${item.baseAC + enh}`]);
    } else if (item.category === 'robe') {
      rows.push(['Armour', 'none (caster)']);
    } else {
      rows.push(['Base AC', String(item.baseAC + enh)]);
      if (enh > 0) rows.push(['Enhancement', `+${enh} AC`]);
    }
    if (item.strRequirement) rows.push(['Str req', String(item.strRequirement)]);
  } else if (item.kind === 'consumable') {
    rows.push(['Action', item.actionCost === 'bonus' ? 'bonus' : 'action']);
    if (item.healDice) rows.push(['Heal', item.healDice]);
  }
  rows.push(['Value', `${rolledCost ?? item.cost} gp`]);

  return rows.map(([label, value]) => (
    <div key={label} className="contents">
      <span className="text-[var(--color-text-dim)] uppercase tracking-wider">{label}</span>
      <span className="text-[var(--color-text-primary)] text-right">{value}</span>
    </div>
  ));
}
