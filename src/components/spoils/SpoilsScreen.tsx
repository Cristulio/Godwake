import type { ItemRef } from '../../schemas/item';
import type { Character } from '../../types/character';
import { useGameStore } from '../../stores/gameStore';
import { Button } from '../ui/Button';
import { GEAR_RARITY_COLOR } from '../inventory/rarity';
import { localizedItemName, localizedItemDescription, localizedAffixEffect, gearRarityLabel } from '../inventory/itemDisplay';
import { affixRelevanceById } from '../inventory/affixRelevance';
import { getLegendary } from '../../content/legendaries';
import { getSetPiece, setForPiece, setProgress } from '../../content/sets';
import { hasPendingLevelUp } from '../../engine/character/leveling';
import { useMetaStore } from '../../stores/metaStore';
import { useT } from '../../i18n/useT';

export function SpoilsScreen() {
  const { t, tc } = useT();
  const lastLoot = useGameStore((s) => s.lastLoot);
  const character = useGameStore((s) => s.character);
  const acceptSpoils = useGameStore((s) => s.acceptSpoils);
  const goToInventory = useGameStore((s) => s.goToInventory);
  const ownedSetPieces = useMetaStore((s) => s.ownedSetPieces);

  if (!lastLoot) return null;

  const leveledUp = character ? hasPendingLevelUp(character) : false;
  const nextLevel = character ? character.level + 1 : null;
  const hasItems =
    lastLoot.items.length > 0 ||
    lastLoot.bankedLegendaryId != null ||
    lastLoot.bankedSetPieceId != null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden animate-fade-in-slow">
      <VictoryBackdrop />

      <div className="relative z-10 w-full max-w-lg flex flex-col gap-5">
        {/* Header */}
        <div className="text-center">
          <h1
            className="font-display text-2xl md:text-3xl text-[var(--color-accent-amber)] tracking-[0.35em] uppercase"
            style={{
              textShadow:
                '0 0 28px rgba(244,167,66,0.7), 0 0 10px rgba(244,167,66,0.9), 4px 4px 0 rgba(0,0,0,0.9)',
            }}
          >
            {t('screens.spoils.victory')}
          </h1>
        </div>

        {/* Reward row: gold + xp */}
        <div className="flex items-center justify-center gap-6 flex-wrap">
          {lastLoot.gold > 0 && (
            <div className="flex items-baseline gap-2 animate-pop-in">
              <span className="font-display text-[var(--color-accent-gold)] text-xl tracking-wider">
                ◈
              </span>
              <span
                className="font-display text-2xl tracking-widest"
                style={{ color: 'var(--color-accent-gold)' }}
              >
                +{lastLoot.gold}
              </span>
              <span className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-[0.3em]">
                {t('screens.spoils.gp')}
              </span>
            </div>
          )}
          {lastLoot.xp > 0 && (
            <div className="flex items-baseline gap-2 animate-pop-in">
              <span className="font-display text-[var(--color-status-frost)] text-xl tracking-wider">
                ✦
              </span>
              <span
                className="font-display text-2xl tracking-widest"
                style={{ color: 'var(--color-status-frost)' }}
              >
                +{lastLoot.xp}
              </span>
              <span className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-[0.3em]">
                {t('screens.spoils.xp')}
              </span>
            </div>
          )}
          {lastLoot.renown > 0 && (
            <div className="flex items-baseline gap-2 animate-pop-in">
              <span className="font-display text-[var(--color-accent-amber)] text-xl tracking-wider">
                ◆
              </span>
              <span
                className="font-display text-2xl tracking-widest"
                style={{ color: 'var(--color-accent-amber)' }}
              >
                +{lastLoot.renown}
              </span>
              <span className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-[0.3em]">
                {t('screens.spoils.renown')}
              </span>
            </div>
          )}
          {lastLoot.gold === 0 && lastLoot.xp === 0 && lastLoot.renown === 0 && (
            <div className="text-[var(--color-text-dim)] text-xs uppercase tracking-[0.3em]">
              {t('screens.spoils.noReward')}
            </div>
          )}
        </div>

        {/* Level-up banner */}
        {leveledUp && nextLevel && (
          <div
            className="text-center animate-scale-in"
            style={{ textShadow: '0 0 18px rgba(244,167,66,0.8)' }}
          >
            <div className="font-display text-lg text-[var(--color-accent-amber)] uppercase tracking-[0.4em]">
              {t('screens.spoils.levelUp', { n: nextLevel })}
            </div>
          </div>
        )}

        {/* Dropped items */}
        {lastLoot.items.length > 0 && (
          <div className="bg-[var(--color-bg-panel)] border-2 border-[var(--color-border-warm)] animate-pop-in">
            <div className="px-3 py-1.5 border-b border-[var(--color-border-dim)]">
              <span className="font-display text-[10px] uppercase tracking-[0.3em] text-[var(--color-accent-amber)]">
                {t('screens.spoils.spoils')}
              </span>
            </div>
            <div className="px-3 py-2 space-y-2">
              {lastLoot.items.map((ref, i) => {
                const rarity = ref.rolled?.rarity ?? 'white';
                return (
                  <div key={`${ref.itemId}-${i}`} className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className="font-display uppercase tracking-wider text-[12px]"
                        style={{ color: GEAR_RARITY_COLOR[rarity] }}
                      >
                        ◆ {localizedItemName(ref)}
                      </span>
                      <span
                        className="text-[9px] uppercase tracking-widest opacity-60 shrink-0 ml-auto"
                        style={{ color: GEAR_RARITY_COLOR[rarity] }}
                      >
                        {gearRarityLabel(rarity)}
                      </span>
                    </div>
                    <SpoilsItemEffects itemRef={ref} character={character} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Legendary banked */}
        {lastLoot.bankedLegendaryId && (() => {
          const id = lastLoot.bankedLegendaryId;
          const legendary = getLegendary(id);
          return (
            <div className="bg-[var(--color-bg-panel)] border-2 border-[var(--color-accent-gold)] px-3 py-2 animate-pop-in">
              <div className="font-display text-[var(--color-accent-gold)] text-sm uppercase tracking-wider">
                ✦ {tc('legendaries', id, 'name', legendary?.name ?? '')}
              </div>
              {legendary && (
                <div className="text-[var(--color-text-secondary)] text-[10px] leading-relaxed mt-0.5">
                  {tc('legendaries', id, 'effect', legendary.effect)}
                </div>
              )}
              <div className="text-[var(--color-text-dim)] text-[9px] uppercase tracking-[0.3em] mt-1">
                {t('screens.spoils.legendaryBanked')}
              </div>
            </div>
          );
        })()}

        {/* Set piece banked */}
        {lastLoot.bankedSetPieceId && (() => {
          const id = lastLoot.bankedSetPieceId;
          const piece = getSetPiece(id);
          const set = setForPiece(id);
          const slotKey = piece ? (piece.slot === 'ring1' || piece.slot === 'ring2' ? 'ring' : piece.slot) : '';
          const have = set ? setProgress(set, ownedSetPieces) : 0;
          return (
            <div className="bg-[var(--color-bg-panel)] border-2 px-3 py-2 animate-pop-in" style={{ borderColor: '#0fa968' }}>
              <div className="font-display text-sm uppercase tracking-wider" style={{ color: '#0fa968' }}>
                ✦ {tc('setGear', id, 'name', piece?.name ?? '')}
              </div>
              {set && piece && (
                <div className="text-[10px] uppercase tracking-[0.2em] mt-0.5" style={{ color: '#0fa968', opacity: 0.85 }}>
                  {t('screens.spoils.setMeta', {
                    set: tc('setGear', set.id, 'name', set.name),
                    slot: t(`screens.spoils.setSlot.${slotKey}`),
                    have,
                    total: set.pieceIds.length,
                  })}
                </div>
              )}
              {piece && (
                <div className="text-[var(--color-text-secondary)] text-[10px] leading-relaxed mt-1">
                  {tc('setGear', id, 'effect', piece.effectLine)}
                </div>
              )}
              {set?.bonuses.map((tier) => {
                const met = have >= tier.piecesRequired;
                return (
                  <div
                    key={tier.piecesRequired}
                    className="text-[9px] leading-relaxed mt-0.5"
                    style={{ color: met ? '#0fa968' : 'var(--color-text-dim)' }}
                  >
                    {met ? '◆ ' : '◇ '}
                    {tc('setGear', `${set.id}.bonus`, String(tier.piecesRequired), tier.label)}
                  </div>
                );
              })}
              <div className="text-[var(--color-text-dim)] text-[9px] uppercase tracking-[0.3em] mt-1">
                {t('screens.spoils.setPieceBanked')}
              </div>
            </div>
          );
        })()}

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 mt-2">
          <Button variant="primary" size="lg" onClick={acceptSpoils}>
            {leveledUp ? t('screens.spoils.acceptLevelUp') : t('screens.spoils.accept')}
          </Button>
          {/* A pending level-up must come first — no pack shortcut that would skip
              it. The dropped items are already in the pack; open it from the route
              map after leveling. */}
          {hasItems && !leveledUp && (
            <button
              type="button"
              onClick={() => {
                acceptSpoils();
                goToInventory();
              }}
              className="text-[var(--color-text-secondary)] text-[10px] uppercase tracking-[0.3em] hover:text-[var(--color-accent-amber)] transition-colors"
            >
              {t('screens.spoils.openPack')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The per-affix effect lines under a dropped item. Rolled loot lists each affix
 * on its own line so an off-archetype one can dim with its "(weapon only — …)"
 * tell; white / un-rolled items fall back to the plain base stat one-liner.
 */
function SpoilsItemEffects({
  itemRef,
  character,
}: {
  itemRef: ItemRef;
  character: Character | null;
}) {
  const affixes = itemRef.rolled?.affixes ?? [];
  if (affixes.length === 0) {
    const description = localizedItemDescription(itemRef);
    if (!description) return null;
    return (
      <div className="text-[var(--color-text-dim)] text-[10px] leading-relaxed pl-4">
        {description}
      </div>
    );
  }
  return (
    <div className="pl-4 space-y-0.5">
      {affixes.map((id) => {
        const rel = affixRelevanceById(id, character);
        return (
          <div
            key={id}
            className="text-[var(--color-text-dim)] text-[10px] leading-relaxed"
            style={{ opacity: rel.relevant ? 1 : 0.45 }}
          >
            {localizedAffixEffect(id)}
            {rel.tag && (
              <span className="ml-1 uppercase tracking-wider text-[9px] opacity-80">({rel.tag})</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function VictoryBackdrop() {
  return (
    <div className="absolute inset-0 [background:radial-gradient(ellipse_at_center,#0d1a0a_0%,#050a04_100%)]">
      <svg
        viewBox="0 0 800 600"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          <radialGradient id="victory-glow" cx="0.5" cy="0.4" r="0.45">
            <stop offset="0%" stopColor="#f4a742" stopOpacity="0.25" />
            <stop offset="60%" stopColor="#2a6e1a" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#050a04" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="800" height="600" fill="#050a04" />
        <rect x="0" y="0" width="800" height="600" fill="url(#victory-glow)" />
      </svg>
      <div className="absolute inset-0 [background:radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.75)_100%)] pointer-events-none" />
    </div>
  );
}
