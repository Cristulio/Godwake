import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import type { RoomSpec } from '../../types/delve';
import { useGameStore } from '../../stores/gameStore';
import { getMonster } from '../../content/monsters';
import { useT } from '../../i18n/useT';

interface EliteRoomProps {
  room: RoomSpec;
}

/**
 * The elite node's risk/reward decision, shown before the fight. Taking the
 * elite-risk path (Fight) is how legendary relics are earned — a win has a real
 * chance to yield one, banked to the hub reliquary. The safe path (Take the
 * gold) skips the fight for a guaranteed purse, but the guardian's parting
 * blow costs HP, and you forgo XP, loot, and any chance at a relic.
 */
export function EliteRoom({ room }: EliteRoomProps) {
  const { t, tc } = useT();
  const pickEliteChoice = useGameStore((s) => s.pickEliteChoice);
  const character = useGameStore((s) => s.character);
  const bounty = room.goldReward ?? 0;
  const partingBlow = character ? Math.max(1, Math.round(character.hp.max * 0.15)) : null;

  const defId = room.monsters?.[0]?.defId;
  let eliteName = t('delve.elite.genericName');
  if (defId) {
    try {
      eliteName = tc('monsters', defId, 'name', getMonster(defId).name);
    } catch {
      /* unknown id — keep the generic label */
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-3xl mx-auto flex flex-col gap-6">
      <Panel tone="warm" title={t('delve.elite.title')}>
        <p className="text-[var(--color-text-secondary)] text-sm italic mb-4 leading-relaxed font-narrative">
          {t('delve.elite.intro', { name: eliteName })}
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="panel-etched border-2 border-[var(--color-accent-blood)] p-4 flex flex-col">
            <div className="font-display text-[var(--color-accent-blood)] uppercase tracking-widest text-[11px] mb-1">
              {t('delve.elite.fightHead')}
            </div>
            <p className="text-[var(--color-text-secondary)] text-xs mb-3 leading-relaxed flex-1">
              {t('delve.elite.fightBodyA')}{' '}
              <span className="text-[var(--color-accent-gold)]">{t('delve.elite.fightBodyLoot')}</span>
              {t('delve.elite.fightBodyB')}{' '}
              <span className="text-[var(--color-accent-gold)]">{t('delve.elite.fightBodyRelic')}</span>{' '}
              {t('delve.elite.fightBodyC')}
            </p>
            <Button variant="primary" onClick={() => pickEliteChoice('fight')} className="w-full">
              {t('delve.elite.fightButton')}
            </Button>
          </div>
          <div className="panel-etched border-2 border-[var(--color-border-warm)] p-4 flex flex-col">
            <div className="font-display text-[var(--color-accent-amber)] uppercase tracking-widest text-[11px] mb-1">
              {t('delve.elite.goldHead')}
            </div>
            <p className="text-[var(--color-text-secondary)] text-xs mb-3 leading-relaxed flex-1">
              {t('delve.elite.goldBodyA')}
              {bounty > 0 ? (
                <>
                  {' '}(<span className="text-[var(--color-accent-gold)]">{t('delve.elite.goldBounty', { n: bounty })}</span>)
                </>
              ) : null}
              {t('delve.elite.goldBodyB')}{' '}
              {partingBlow !== null ? (
                <span className="text-[var(--color-accent-blood)]">{t('delve.elite.goldLoseHp', { n: partingBlow })}</span>
              ) : (
                <span className="text-[var(--color-accent-blood)]">{t('delve.elite.goldLoseHpUnknown')}</span>
              )}{' '}
              {t('delve.elite.goldBodyC')}
            </p>
            <Button variant="secondary" onClick={() => pickEliteChoice('gold')} className="w-full">
              {t('delve.elite.goldButton')}
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
