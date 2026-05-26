import { useGameStore } from '../../stores/gameStore';
import { getMonster, listMonsters } from '../../content/monsters';
import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { MonsterPortrait } from '../combat/MonsterPortrait';
import { abilityModifier, ABILITY_NAMES } from '../../types/abilities';

export function CodexScreen() {
  const discovered = useGameStore((s) => s.discoveredMonsters);
  const goToHub = useGameStore((s) => s.goToHub);

  const all = listMonsters();

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto">
      <header className="flex justify-between items-center mb-8 pb-4 border-b border-[var(--color-border-warm)]">
        <div>
          <h1 className="text-2xl md:text-3xl text-[var(--color-accent-amber)] tracking-wider">
            THE TOWN LIBRARY
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest">
            Bestiary · {discovered.length} / {all.length} discovered
          </p>
        </div>
        <Button variant="secondary" onClick={goToHub}>
          ← Phandalin
        </Button>
      </header>

      <div className="grid md:grid-cols-2 gap-4">
        {all.map((m) => {
          const known = discovered.includes(m.id);
          return known ? (
            <MonsterEntry key={m.id} defId={m.id} />
          ) : (
            <Panel key={m.id} className="opacity-50">
              <div className="flex items-center gap-3">
                <div className="w-16 h-20 bg-[var(--color-bg-elevated)] flex items-center justify-center text-2xl text-[var(--color-text-dim)]">
                  ?
                </div>
                <div>
                  <div className="text-[var(--color-text-dim)] uppercase tracking-widest text-sm">
                    Unknown
                  </div>
                  <div className="text-[var(--color-text-muted)] text-xs italic">
                    Defeat one to add this entry.
                  </div>
                </div>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

function MonsterEntry({ defId }: { defId: string }) {
  const m = getMonster(defId);

  return (
    <Panel className="animate-fade-in">
      <div className="flex gap-4">
        <div className="w-20 h-28 bg-[var(--color-bg-elevated)] border border-[var(--color-border-dim)] flex items-end justify-center shrink-0 p-1">
          <MonsterPortrait defId={defId} className="w-full h-full" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[var(--color-accent-amber)] uppercase tracking-wider font-bold">
            {m.name}
          </div>
          <div className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest mb-2">
            CR {m.cr} · {m.creatureType}
          </div>
          <div className="grid grid-cols-3 gap-1 text-[10px] font-mono mb-2">
            <Stat label="HP" value={String(m.maxHp)} />
            <Stat label="AC" value={String(m.ac)} />
            <Stat label="Speed" value={`${m.speed} ft`} />
          </div>
          <div className="grid grid-cols-6 gap-0.5 text-[9px] font-mono mb-2">
            {ABILITY_NAMES.map((a) => {
              const score = m.abilityScores[a] ?? 10;
              const mod = abilityModifier(score);
              return (
                <div key={a} className="text-center bg-[var(--color-bg-elevated)] py-0.5">
                  <div className="text-[var(--color-text-dim)] uppercase">{a}</div>
                  <div className="text-[var(--color-text-primary)]">
                    {score} ({mod >= 0 ? '+' : ''}
                    {mod})
                  </div>
                </div>
              );
            })}
          </div>
          {m.flavorText && (
            <p className="text-[var(--color-text-secondary)] text-xs italic leading-snug mt-2">
              {m.flavorText}
            </p>
          )}
          {(m.vulnerabilities || m.resistances || m.immunities) && (
            <div className="mt-2 flex flex-wrap gap-1 text-[9px] uppercase tracking-widest">
              {m.vulnerabilities?.map((d) => (
                <span key={d} className="bg-[var(--color-accent-blood)]/30 text-[var(--color-accent-blood)] px-1.5 py-0.5">
                  vuln {d}
                </span>
              ))}
              {m.resistances?.map((d) => (
                <span key={d} className="bg-[var(--color-status-frost)]/20 text-[var(--color-status-frost)] px-1.5 py-0.5">
                  resist {d}
                </span>
              ))}
              {m.immunities?.map((d) => (
                <span key={d} className="bg-[var(--color-text-dim)]/30 text-[var(--color-text-secondary)] px-1.5 py-0.5">
                  immune {d}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--color-bg-elevated)] py-0.5 px-1.5">
      <span className="text-[var(--color-text-dim)] uppercase mr-1">{label}</span>
      <span className="text-[var(--color-text-primary)]">{value}</span>
    </div>
  );
}
