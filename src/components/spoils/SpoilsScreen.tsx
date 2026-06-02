import { useGameStore } from '../../stores/gameStore';
import { Button } from '../ui/Button';
import { GEAR_RARITY_COLOR, GEAR_RARITY_LABEL } from '../inventory/rarity';
import { hasPendingLevelUp } from '../../engine/character/leveling';

export function SpoilsScreen() {
  const lastLoot = useGameStore((s) => s.lastLoot);
  const character = useGameStore((s) => s.character);
  const acceptSpoils = useGameStore((s) => s.acceptSpoils);
  const goToInventory = useGameStore((s) => s.goToInventory);

  if (!lastLoot) return null;

  const leveledUp = character ? hasPendingLevelUp(character) : false;
  const nextLevel = character ? character.level + 1 : null;
  const hasItems = lastLoot.items.length > 0 || lastLoot.bankedLegendary != null;

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
            ◆ Victory ◆
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
                gp
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
                xp
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
                renown
              </span>
            </div>
          )}
          {lastLoot.gold === 0 && lastLoot.xp === 0 && lastLoot.renown === 0 && (
            <div className="text-[var(--color-text-dim)] text-xs uppercase tracking-[0.3em]">
              No reward
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
              ◆ Level Up → {nextLevel} ◆
            </div>
          </div>
        )}

        {/* Dropped items */}
        {lastLoot.items.length > 0 && (
          <div className="bg-[var(--color-bg-panel)] border-2 border-[var(--color-border-warm)] animate-pop-in">
            <div className="px-3 py-1.5 border-b border-[var(--color-border-dim)]">
              <span className="font-display text-[10px] uppercase tracking-[0.3em] text-[var(--color-accent-amber)]">
                Spoils
              </span>
            </div>
            <div className="px-3 py-2 space-y-2">
              {lastLoot.items.map((item, i) => (
                <div key={`${item.name}-${i}`} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-display uppercase tracking-wider text-[12px]"
                      style={{ color: GEAR_RARITY_COLOR[item.rarity] }}
                    >
                      ◆ {item.name}
                    </span>
                    <span
                      className="text-[9px] uppercase tracking-widest opacity-60 shrink-0 ml-auto"
                      style={{ color: GEAR_RARITY_COLOR[item.rarity] }}
                    >
                      {GEAR_RARITY_LABEL[item.rarity]}
                    </span>
                  </div>
                  {item.description && (
                    <div className="text-[var(--color-text-dim)] text-[10px] leading-relaxed pl-4">
                      {item.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legendary banked */}
        {lastLoot.bankedLegendary && (
          <div className="bg-[var(--color-bg-panel)] border-2 border-[var(--color-accent-gold)] px-3 py-2 animate-pop-in">
            <div className="font-display text-[var(--color-accent-gold)] text-sm uppercase tracking-wider">
              ✦ {lastLoot.bankedLegendary}
            </div>
            <div className="text-[var(--color-text-dim)] text-[9px] uppercase tracking-[0.3em] mt-0.5">
              Legendary relic banked — attune it at the hub
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 mt-2">
          <Button variant="primary" size="lg" onClick={acceptSpoils}>
            {leveledUp ? 'Accept · Level Up →' : 'Accept →'}
          </Button>
          {hasItems && (
            <button
              type="button"
              onClick={() => {
                acceptSpoils();
                goToInventory();
              }}
              className="text-[var(--color-text-secondary)] text-[10px] uppercase tracking-[0.3em] hover:text-[var(--color-accent-amber)] transition-colors"
            >
              ◆ Open Pack Instead
            </button>
          )}
        </div>
      </div>
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
