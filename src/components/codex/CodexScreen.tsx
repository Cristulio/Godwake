import { useMemo, useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { getMonster, listMonsters } from '../../content/monsters';
import { Button } from '../ui/Button';
import { MonsterPortrait } from '../combat/MonsterPortrait';
import { MonsterDetailPanel } from './MonsterDetailPanel';

type Filter = 'all' | 'encountered' | 'undiscovered';

export function CodexScreen() {
  const discovered = useGameStore((s) => s.discoveredMonsters);
  const encounters = useGameStore((s) => s.monsterEncounters);
  const goToHub = useGameStore((s) => s.goToHub);

  const all = useMemo(() => listMonsters(), []);
  const discoveredSet = useMemo(() => new Set(discovered), [discovered]);

  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((m) => {
      const known = discoveredSet.has(m.id);
      if (filter === 'encountered' && !known) return false;
      if (filter === 'undiscovered' && known) return false;
      if (q && known && !m.name.toLowerCase().includes(q)) return false;
      // Unknown monsters: only match if the query is empty (their name is hidden).
      if (q && !known) return false;
      return true;
    });
  }, [all, discoveredSet, filter, search]);

  const openMonster = openId ? getMonster(openId) : null;

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto animate-room-enter">
      <header className="flex flex-wrap justify-between items-end gap-3 mb-6 pb-4 border-b border-[var(--color-border-warm)]">
        <div>
          <h1
            className="font-display text-2xl md:text-3xl text-[var(--color-accent-amber)] tracking-[0.15em]"
            style={{ textShadow: '3px 3px 0 rgba(0,0,0,0.85), 0 0 18px rgba(244,167,66,0.3)' }}
          >
            THE BESTIARY
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest mt-1">
            Town Library · <span className="text-[var(--color-accent-gold)]">{discovered.length}</span> / {all.length} discovered
          </p>
        </div>
        <Button variant="ghost" onClick={goToHub}>
          ← Phandalin
        </Button>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex gap-1">
          <FilterTab active={filter === 'all'} onClick={() => setFilter('all')} label="All" />
          <FilterTab
            active={filter === 'encountered'}
            onClick={() => setFilter('encountered')}
            label={`Encountered (${discovered.length})`}
          />
          <FilterTab
            active={filter === 'undiscovered'}
            onClick={() => setFilter('undiscovered')}
            label={`Undiscovered (${all.length - discovered.length})`}
          />
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="search by name…"
          className="
            font-mono bg-[var(--color-bg-deep)] border-2 border-[var(--color-border-warm)]
            px-3 py-1.5 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-dim)]
            focus:outline-none focus:border-[var(--color-accent-amber)]
            min-w-[220px] uppercase tracking-widest
          "
          aria-label="Search bestiary by monster name"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center text-[var(--color-text-dim)] text-sm italic py-12 font-mono">
          No entries match.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filtered.map((m) => {
            const known = discoveredSet.has(m.id);
            return known ? (
              <KnownCard
                key={m.id}
                defId={m.id}
                name={m.name}
                cr={m.cr}
                count={encounters[m.id] ?? 0}
                onClick={() => setOpenId(m.id)}
              />
            ) : (
              <UnknownCard key={m.id} />
            );
          })}
        </div>
      )}

      {openMonster && (
        <MonsterDetailPanel
          monster={openMonster}
          encounters={encounters[openMonster.id] ?? 0}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}

function FilterTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        btn-chunky relative px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold border-2 transition-colors
        ${
          active
            ? 'bg-[var(--color-accent-amber)] text-[var(--color-bg-base)] border-[var(--color-accent-gold)]'
            : 'bg-[var(--color-bg-panel)] text-[var(--color-text-secondary)] border-[var(--color-border-warm)] hover:bg-[var(--color-bg-panel-hover)] hover:text-[var(--color-accent-amber)]'
        }
      `}
    >
      {label}
      {active && (
        <span
          className="absolute -bottom-[2px] left-2 right-2 h-[2px] bg-[var(--color-accent-gold)]"
          aria-hidden
        />
      )}
    </button>
  );
}

function KnownCard({
  defId,
  name,
  cr,
  count,
  onClick,
}: {
  defId: string;
  name: string;
  cr: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        group panel-etched-warm border border-[var(--color-border-warm)]
        hover:border-[var(--color-accent-amber)]
        transition-all p-2 text-left flex flex-col gap-2 animate-fade-in
        hover:shadow-[0_0_18px_rgba(244,167,66,0.25)]
      "
      title={`View ${name}`}
    >
      <div className="relative w-full h-[120px] bg-[var(--color-bg-deep)] border border-[var(--color-border-dim)] flex items-end justify-center p-1 overflow-hidden">
        <div className="transition-all duration-300 group-hover:[filter:drop-shadow(0_0_18px_rgba(244,167,66,0.25))] w-full h-[96px] flex items-end justify-center">
          <MonsterPortrait defId={defId} className="w-full h-full" />
        </div>
        <div className="absolute top-1 left-1 bg-[var(--color-bg-base)]/85 border border-[var(--color-accent-gold)] text-[var(--color-accent-gold)] text-[9px] uppercase tracking-widest px-1.5 py-0.5 font-display">
          CR {cr}
        </div>
      </div>
      <div className="min-w-0">
        <div className="font-display text-[var(--color-accent-amber)] uppercase tracking-wider text-[10px] truncate group-hover:text-[var(--color-accent-torch)]">
          {name}
        </div>
        <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest font-mono mt-0.5">
          × {count} {count === 1 ? 'kill' : 'kills'}
        </div>
      </div>
    </button>
  );
}

function UnknownCard() {
  return (
    <div
      className="
        panel-etched border border-[var(--color-border-dim)] opacity-70
        p-2 flex flex-col gap-2 cursor-not-allowed
      "
      title="Defeat one to add this entry."
      aria-label="Undiscovered monster"
    >
      <div className="w-full h-[120px] bg-[var(--color-bg-deep)] border border-[var(--color-border-dim)] flex items-center justify-center text-4xl text-[var(--color-text-muted)] font-display animate-pulse">
        ?
      </div>
      <div>
        <div className="font-display text-[var(--color-text-dim)] uppercase tracking-wider text-[10px]">
          ???
        </div>
        <div className="text-[var(--color-text-muted)] text-[10px] italic font-mono mt-0.5">
          Undiscovered
        </div>
      </div>
    </div>
  );
}
