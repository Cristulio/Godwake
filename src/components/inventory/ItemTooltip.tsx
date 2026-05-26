import type { Item, Rarity } from '../../schemas/item';

interface ItemTooltipProps {
  item: Item;
  /** Show the click-to-act hint at the bottom (e.g. "Click to equip"). */
  hint?: string;
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

export function ItemTooltip({ item, hint }: ItemTooltipProps) {
  return (
    <div
      role="tooltip"
      className="w-64 bg-[var(--color-bg-panel)] border-2 border-[var(--color-accent-amber)] p-3 shadow-[0_4px_16px_rgba(0,0,0,0.6)] pointer-events-none select-none"
    >
      <div className="text-[var(--color-text-primary)] font-bold uppercase tracking-wider text-sm leading-tight">
        {item.name}
      </div>
      <div
        className="text-[10px] uppercase tracking-widest mt-0.5"
        style={{ color: RARITY_COLOR[item.rarity] }}
      >
        {kindLabel(item)} · {RARITY_LABEL[item.rarity]}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[11px] font-mono">
        {renderStats(item)}
      </div>

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
      return item.category === 'shield' ? 'shield' : `${item.category} armor`;
    case 'consumable':
      return `${item.effect} consumable`;
  }
}

function renderStats(item: Item) {
  const rows: Array<[string, string]> = [];
  if (item.kind === 'weapon') {
    rows.push(['Damage', `${item.damage} ${item.damageType}`]);
    if (item.versatileDamage) rows.push(['Versatile', item.versatileDamage]);
    if (item.range) rows.push(['Range', `${item.range[0]}/${item.range[1]} ft`]);
    if (item.properties.length > 0) {
      rows.push(['Properties', item.properties.join(', ')]);
    }
  } else if (item.kind === 'armor') {
    if (item.category === 'shield') {
      rows.push(['AC bonus', `+${item.baseAC}`]);
    } else {
      rows.push(['Base AC', String(item.baseAC)]);
    }
    if (item.stealthDisadvantage) rows.push(['Stealth', 'disadvantage']);
    if (item.strRequirement) rows.push(['Str req', String(item.strRequirement)]);
  } else if (item.kind === 'consumable') {
    rows.push(['Action', item.actionCost === 'bonus' ? 'bonus' : 'action']);
    if (item.healDice) rows.push(['Heal', item.healDice]);
  }
  rows.push(['Weight', `${item.weight} lb`]);
  rows.push(['Value', `${item.cost} gp`]);
  if (item.kind !== 'consumable' && item.attunement) {
    rows.push(['Attunement', 'required']);
  }

  return rows.map(([label, value]) => (
    <div key={label} className="contents">
      <span className="text-[var(--color-text-dim)] uppercase tracking-wider">{label}</span>
      <span className="text-[var(--color-text-primary)] text-right">{value}</span>
    </div>
  ));
}
