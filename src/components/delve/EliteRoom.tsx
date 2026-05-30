import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import type { RoomSpec } from '../../types/delve';
import { useGameStore } from '../../stores/gameStore';
import { getMonster } from '../../content/monsters';

interface EliteRoomProps {
  room: RoomSpec;
}

/**
 * The elite node's risk/reward decision, shown before the fight. Taking the
 * elite-risk path (Fight) is how legendary relics are earned — a win has a real
 * chance to yield one, banked to the hub reliquary. The safe path (Take the
 * gold) skips the fight for a guaranteed purse, with no loot and no relic.
 */
export function EliteRoom({ room }: EliteRoomProps) {
  const pickEliteChoice = useGameStore((s) => s.pickEliteChoice);
  const bounty = room.goldReward ?? 0;

  const defId = room.monsters?.[0]?.defId;
  let eliteName = 'An elite foe';
  if (defId) {
    try {
      eliteName = getMonster(defId).name;
    } catch {
      /* unknown id — keep the generic label */
    }
  }

  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto flex flex-col gap-6">
      <Panel tone="warm" title="An Elite Bars the Way">
        <p className="text-[var(--color-text-secondary)] text-sm italic mb-4 leading-relaxed font-narrative">
          {eliteName} holds this ground — scarred, deadly, and guarding something the dark does not
          give up lightly. You can take it on, or take the coin it watches over and slip past.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="panel-etched border-2 border-[var(--color-accent-blood)] p-4 flex flex-col">
            <div className="font-display text-[var(--color-accent-blood)] uppercase tracking-widest text-[11px] mb-1">
              ⚔ Fight the elite
            </div>
            <p className="text-[var(--color-text-secondary)] text-xs mb-3 leading-relaxed flex-1">
              Risk the harder battle. A victory may yield a{' '}
              <span className="text-[var(--color-accent-gold)]">legendary relic</span> — kept by the
              soul, equipped at the hub — on top of its gold and loot.
            </p>
            <Button variant="primary" onClick={() => pickEliteChoice('fight')} className="w-full">
              ⚔ Face it
            </Button>
          </div>
          <div className="panel-etched border-2 border-[var(--color-border-warm)] p-4 flex flex-col">
            <div className="font-display text-[var(--color-accent-amber)] uppercase tracking-widest text-[11px] mb-1">
              ◆ Take the gold
            </div>
            <p className="text-[var(--color-text-secondary)] text-xs mb-3 leading-relaxed flex-1">
              Slip past with the coin it guards
              {bounty > 0 ? (
                <>
                  {' '}— <span className="text-[var(--color-accent-gold)]">{bounty} gold</span>
                </>
              ) : (
                ''
              )}
              . Safe, but no relic and no loot.
            </p>
            <Button variant="secondary" onClick={() => pickEliteChoice('gold')} className="w-full">
              ◆ Take it and go
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
