import { useEffect } from 'react';
import type { Monster, MonsterAction } from '../../schemas/monster';
import { getMonster } from '../../content/monsters';
import { MonsterPortrait } from '../combat/MonsterPortrait';
import { abilityModifier, ABILITY_NAMES } from '../../types/abilities';
import { localizedDamageType } from '../inventory/itemDisplay';
import { useT } from '../../i18n/useT';

type TFn = (key: string, params?: Record<string, string | number>) => string;
type TcFn = (namespace: string, id: string, field: string, fallbackEnglish: string) => string;

interface MonsterDetailPanelProps {
  monster: Monster;
  encounters: number;
  defeated: number;
  killedByCount: number;
  killingAbilities: Record<string, number>;
  onClose: () => void;
}

export function MonsterDetailPanel({
  monster,
  encounters,
  defeated,
  killedByCount,
  killingAbilities,
  onClose,
}: MonsterDetailPanelProps) {
  const { t, tc } = useT();
  const monsterName = tc('monsters', monster.id, 'name', monster.name);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 bg-black/85 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t('screens.monsterDetail.entryAria', { name: monsterName })}
    >
      <div
        className="panel-etched-warm border-2 border-[var(--color-accent-gold)] max-w-3xl w-full max-h-[85vh] overflow-y-auto animate-pop-in"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: '0 0 32px rgba(244,167,66,0.18)' }}
      >
        <div className="flex items-start justify-between gap-3 p-4 border-b-2 border-[var(--color-border-warm)]">
          <div>
            <h2
              className="font-display text-[var(--color-accent-amber)] text-lg md:text-xl uppercase tracking-[0.15em]"
              style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.85), 0 0 14px rgba(244,167,66,0.3)' }}
            >
              {monsterName}
            </h2>
            <p className="text-[var(--color-text-secondary)] text-[10px] uppercase tracking-widest mt-1 font-mono">
              {t('screens.monsterDetail.subtitle', {
                cr: monster.cr,
                size: monster.size,
                type: monster.creatureType,
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="font-display text-[var(--color-text-secondary)] hover:text-[var(--color-accent-amber)] text-[10px] uppercase tracking-widest"
            title={t('screens.monsterDetail.closeTitle')}
          >
            {t('screens.monsterDetail.close')}
          </button>
        </div>

        <div className="p-4 grid md:grid-cols-[180px_1fr] gap-5">
          <div className="flex flex-col items-center gap-3">
            <div className="w-[160px] h-[220px] bg-[var(--color-bg-deep)] border-2 border-[var(--color-border-warm)] flex items-end justify-center p-2">
              <MonsterPortrait defId={monster.id} className="w-full h-full" />
            </div>
            <div className="panel-etched border border-[var(--color-border-dim)] px-3 py-2 w-full grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="font-display text-[var(--color-text-dim)] uppercase tracking-widest text-[8px]">
                  {t('screens.monsterDetail.met')}
                </div>
                <div className="text-[var(--color-accent-gold)] font-mono text-base">
                  {encounters}
                </div>
              </div>
              <div>
                <div className="font-display text-[var(--color-text-dim)] uppercase tracking-widest text-[8px]">
                  {t('screens.monsterDetail.slain')}
                </div>
                <div className="text-[var(--color-status-poison)] font-mono text-base">
                  {defeated}
                </div>
              </div>
              <div>
                <div className="font-display text-[var(--color-text-dim)] uppercase tracking-widest text-[8px]">
                  {t('screens.monsterDetail.felledBy')}
                </div>
                <div
                  className={`font-mono text-base ${killedByCount > 0 ? 'text-[var(--color-accent-blood)]' : 'text-[var(--color-text-dim)]'}`}
                >
                  {killedByCount}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 min-w-0">
            <div>
              <SectionHeader>{t('screens.monsterDetail.stats')}</SectionHeader>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <Stat label="HP" value={String(monster.maxHp)} accentValue />
                <Stat label="AC" value={String(monster.ac)} accentValue />
              </div>

              <div className="grid grid-cols-6 gap-1 text-[10px] font-mono mt-2">
                {ABILITY_NAMES.map((a) => {
                  const score = monster.abilityScores[a] ?? 10;
                  const mod = abilityModifier(score);
                  return (
                    <div
                      key={a}
                      className="text-center panel-etched border border-[var(--color-border-dim)] py-1"
                      title={t(`ui.level.ability.${a}`)}
                    >
                      <div className="text-[var(--color-text-dim)] uppercase font-display text-[8px]">{a}</div>
                      <div className="text-[var(--color-text-primary)]">{score}</div>
                      <div className="text-[var(--color-accent-amber)]">
                        {mod >= 0 ? '+' : ''}
                        {mod}
                      </div>
                    </div>
                  );
                })}
              </div>

              {(monster.vulnerabilities || monster.resistances || monster.immunities) && (
                <div className="flex flex-wrap gap-1.5 text-[10px] uppercase tracking-widest mt-2 font-mono">
                  {monster.vulnerabilities?.map((d) => (
                    <span
                      key={`v-${d}`}
                      className="bg-[var(--color-accent-blood)]/30 text-[var(--color-accent-blood)] px-2 py-0.5 border border-[var(--color-accent-blood)]/50"
                    >
                      {t('screens.monsterDetail.vuln', { d })}
                    </span>
                  ))}
                  {monster.resistances?.map((d) => (
                    <span
                      key={`r-${d}`}
                      className="bg-[var(--color-status-frost)]/20 text-[var(--color-status-frost)] px-2 py-0.5 border border-[var(--color-status-frost)]/40"
                    >
                      {t('screens.monsterDetail.resist', { d })}
                    </span>
                  ))}
                  {monster.immunities?.map((d) => (
                    <span
                      key={`i-${d}`}
                      className="bg-[var(--color-text-dim)]/30 text-[var(--color-text-secondary)] px-2 py-0.5 border border-[var(--color-border-dim)]"
                    >
                      {t('screens.monsterDetail.immune', { d })}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <SectionHeader>{t('screens.monsterDetail.actions')}</SectionHeader>
              <div className="flex flex-col gap-2">
                {monster.actions.map((a, i) => (
                  <ActionRow
                    key={`${a.kind}-${a.name}-${i}`}
                    action={a}
                    killCount={killingAbilities[a.name] ?? 0}
                    t={t}
                    tc={tc}
                  />
                ))}
              </div>
            </div>

            {monster.flavorText && (
              <div>
                <SectionHeader>{t('screens.monsterDetail.lore')}</SectionHeader>
                <p className="text-[var(--color-text-secondary)] text-xs italic leading-relaxed font-narrative">
                  {tc('monsters', monster.id, 'flavorText', monster.flavorText)}
                </p>
              </div>
            )}

            {monster.bossMechanic && (
              <div className="bg-[var(--color-accent-blood)]/10 border-2 border-[var(--color-accent-blood)]/40 p-2.5">
                <div className="font-display text-[var(--color-accent-blood)] text-[10px] uppercase tracking-widest mb-1">
                  {t('screens.monsterDetail.bossMechanicHeader')}
                </div>
                <p className="text-[var(--color-text-secondary)] text-xs leading-snug">
                  {t(`screens.monsterDetail.bossMechanic.${monster.bossMechanic}`)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-display text-[var(--color-accent-amber)] text-[10px] uppercase tracking-[0.2em] mb-2 pb-1 border-b border-[var(--color-border-dim)]">
      {children}
    </div>
  );
}

function ActionRow({
  action,
  killCount,
  t,
  tc,
}: {
  action: MonsterAction;
  killCount: number;
  t: TFn;
  tc: TcFn;
}) {
  const killBadge =
    killCount > 0 ? (
      <span
        className="bg-[var(--color-accent-blood)]/30 text-[var(--color-accent-blood)] border border-[var(--color-accent-blood)]/50 px-1.5 py-0.5 text-[9px] uppercase tracking-widest font-mono"
        title={t('screens.monsterDetail.killedYouTitle')}
      >
        {t('screens.monsterDetail.killedYou', { n: killCount })}
      </span>
    ) : null;
  if (action.kind === 'attack') {
    const bonus = action.attackBonus >= 0 ? `+${action.attackBonus}` : `${action.attackBonus}`;
    return (
      <div className="panel-etched border border-[var(--color-border-dim)] p-2">
        <div className="font-display text-[var(--color-text-primary)] text-[11px] uppercase tracking-wider">
          {action.name}
        </div>
        <div className="font-mono text-[11px] text-[var(--color-text-secondary)] mt-1">
          <span className="text-[var(--color-accent-gold)]">{bonus}</span> {t('screens.monsterDetail.toHit')} ·{' '}
          <span className="text-[var(--color-accent-amber)]">{action.damage}</span> {localizedDamageType(action.damageType)}
        </div>
        {action.description && (
          <p className="text-[var(--color-text-secondary)] text-[11px] italic mt-1 leading-snug">
            {action.description}
          </p>
        )}
        {killBadge && <div className="mt-1.5">{killBadge}</div>}
      </div>
    );
  }
  const { meta, body } = actionSummary(action, t, tc);
  return (
    <div className="panel-etched border border-[var(--color-border-dim)] p-2">
      <div className="flex items-baseline justify-between gap-2">
        <div className="font-display text-[var(--color-text-primary)] text-[11px] uppercase tracking-wider">
          {action.name}
        </div>
        <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest font-mono">
          {meta}
        </div>
      </div>
      <div className="font-mono text-[11px] text-[var(--color-text-secondary)] mt-1">{body}</div>
      {action.description && (
        <p className="text-[var(--color-text-secondary)] text-[11px] italic mt-1 leading-snug">
          {action.description}
        </p>
      )}
      {killBadge && <div className="mt-1.5">{killBadge}</div>}
    </div>
  );
}

/** One-line meta (right) + body summary for a non-attack monster action. */
function actionSummary(
  action: Exclude<MonsterAction, { kind: 'attack' }>,
  t: TFn,
  tc: TcFn,
): { meta: string; body: string } {
  switch (action.kind) {
    case 'paralyze':
      return {
        meta: t('screens.monsterDetail.rounds', { n: action.durationRounds }),
        body: `DC ${action.saveDC} ${action.saveAbility.toUpperCase()} ${t('screens.monsterDetail.save')} · ${t('screens.monsterDetail.paralyze')}`,
      };
    case 'debuff':
      return {
        meta: t('screens.monsterDetail.rounds', { n: action.durationRounds }),
        body: `DC ${action.saveDC} ${action.saveAbility.toUpperCase()} ${t('screens.monsterDetail.save')} · ${action.condition}`,
      };
    case 'summon': {
      const name = monsterNameOrId(action.summonDefId, tc);
      return {
        meta: t('screens.monsterDetail.summon'),
        body: t('screens.monsterDetail.summons', { n: action.count ?? 1, name }),
      };
    }
    case 'sustain': {
      const bits: string[] = [];
      if (action.heal) bits.push(t('screens.monsterDetail.heals', { x: action.heal }));
      if (action.wardTempHp !== undefined)
        bits.push(t('screens.monsterDetail.wards', { n: action.wardTempHp }));
      const who =
        (action.target ?? 'self') === 'ally'
          ? t('screens.monsterDetail.anAlly')
          : t('screens.monsterDetail.itself');
      return {
        meta: t('screens.monsterDetail.support'),
        body: `${bits.join(' · ') || t('screens.monsterDetail.sustains')} (${who})`,
      };
    }
    case 'multiattack':
      return {
        meta: t('screens.monsterDetail.multiMeta', { n: action.attacks }),
        body: t('screens.monsterDetail.multiBody', { n: action.attacks }),
      };
  }
}

function monsterNameOrId(defId: string, tc: TcFn): string {
  try {
    const m = getMonster(defId);
    return tc('monsters', m.id, 'name', m.name);
  } catch {
    return defId;
  }
}

function Stat({ label, value, accentValue = false }: { label: string; value: string; accentValue?: boolean }) {
  return (
    <div className="panel-etched border border-[var(--color-border-dim)] px-2 py-1.5 flex items-baseline gap-2">
      <span className="font-display text-[var(--color-text-dim)] uppercase tracking-widest text-[8px]">
        {label}
      </span>
      <span
        className={accentValue ? 'text-[var(--color-accent-gold)] font-mono' : 'text-[var(--color-text-primary)] font-mono'}
      >
        {value}
      </span>
    </div>
  );
}
