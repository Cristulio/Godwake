import { useEffect, useRef } from 'react';
import type { Character } from '../../types/character';
import type { DelveState, RoomSpec } from '../../types/delve';
import { useGameStore } from '../../stores/gameStore';
import { currentRoom } from '../../engine/delve';
import { createCombat } from '../../engine/combat';
import { getActiveRoller } from '../../engine/dice';
import { withResetActionEconomy } from '../../engine/character/actions';
import { playSfx } from '../../engine/audio';
import { getMonster } from '../../content/monsters';
import { CombatScreen } from '../combat/CombatScreen';
import type { BattlefieldDecoration } from '../combat/Battlefield';
import { RestRoom } from './RestRoom';
import { TreasureRoom } from './TreasureRoom';
import { ShrineRoom } from './ShrineRoom';
import { CampRoom } from './CampRoom';
import { EventRoom } from './EventRoom';
import { ShopRoom } from './ShopRoom';
import { EliteRoom } from './EliteRoom';
import { DelveMap } from './DelveMap';
import { DelveSummary } from './DelveSummary';
import { PostmortemModal } from './PostmortemModal';
import { RoomHeader } from './RoomHeader';
import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';
import { GEAR_RARITY_COLOR, GEAR_RARITY_LABEL } from '../inventory/rarity';

function decorationForRoom(room: RoomSpec, chapterId: string): BattlefieldDecoration {
  // Branching Godwake delve: nodes carry their chapter, so the backdrop keys
  // off that (boss rooms get the throne/hall variant) rather than hard-coded
  // room ids that the map no longer numbers linearly.
  if (room.chapter) {
    const isBoss = room.kind === 'boss';
    switch (room.chapter) {
      case 1:
        return isBoss ? 'wardens-hall' : 'iron-cells';
      case 2:
        return isBoss ? 'magistrate-hall' : 'athkatla-street';
      case 3:
        return isBoss ? 'spellhold-warden-chamber' : 'spellhold-corridor';
      case 4:
        return isBoss ? 'ust-natha-throne' : 'underdark-tunnel';
      case 5:
      case 6:
        // The Godwake / the Loom have no bespoke backdrop art yet — the pale
        // dawn-light and the wheel fall back to the neutral scene.
        return 'generic';
    }
  }
  const roomId = room.id;
  // Legacy fallback for the old linear Godwake layout (fixed room-N ids). The
  // branching delve sets `room.chapter` on every node, so the chapter switch
  // above handles all six chapters and this id table is only reached if a node
  // ever lacks a chapter tag.
  if (chapterId === 'godwake') {
    switch (roomId) {
      // Ch1 combat
      case 'room-1':
      case 'room-4':
        return 'iron-cells';
      case 'room-6':
        return 'vivisector-lab';
      case 'room-8':
        return 'iron-cells';
      // Ch1 boss
      case 'room-10':
        return 'wardens-hall';
      // Ch2 combat
      case 'room-12':
      case 'room-15':
      case 'room-17':
        return 'athkatla-street';
      // Ch2 boss
      case 'room-19':
        return 'magistrate-hall';
      // Ch3 combat
      case 'room-21':
      case 'room-24':
      case 'room-26':
        return 'spellhold-corridor';
      // Ch3 boss
      case 'room-28':
        return 'spellhold-warden-chamber';
      // Ch4 combat
      case 'room-30':
      case 'room-33':
        return 'underdark-tunnel';
      case 'room-35':
        return 'ust-natha-temple';
      // Ch4 boss
      case 'room-37':
        return 'ust-natha-throne';
      default:
        return 'generic';
    }
  }
  if (chapterId === 'chapter-2') {
    if (roomId === 'room-8') return 'magistrate-hall';
    return 'athkatla-street';
  }
  if (chapterId === 'chapter-3') {
    if (roomId === 'room-8') return 'spellhold-warden-chamber';
    return 'spellhold-corridor';
  }
  if (chapterId === 'chapter-4') {
    if (roomId === 'room-8') return 'ust-natha-throne';
    if (roomId === 'room-7' || roomId === 'room-5') return 'ust-natha-temple';
    return 'underdark-tunnel';
  }
  switch (roomId) {
    case 'room-1':
    case 'room-3':
    case 'room-7':
      return 'iron-cells';
    case 'room-5':
      return 'vivisector-lab';
    case 'room-8':
      return 'wardens-hall';
    default:
      return 'generic';
  }
}

export function DelveScreen() {
  return (
    <>
      <DelveScreenBody />
      <LootPane />
    </>
  );
}

function DelveScreenBody() {
  const character = useGameStore((s) => s.character);
  const delve = useGameStore((s) => s.delve);
  const combat = useGameStore((s) => s.combat);
  const postmortem = useGameStore((s) => s.postmortem);
  const setCombat = useGameStore((s) => s.setCombat);
  const setCharacter = useGameStore((s) => s.setCharacter);
  const goToHub = useGameStore((s) => s.goToHub);
  const advanceRoom = useGameStore((s) => s.advanceRoom);
  const resolveRoomVictory = useGameStore((s) => s.resolveRoomVictory);
  const finishDelve = useGameStore((s) => s.finishDelve);
  const failDelve = useGameStore((s) => s.failDelve);

  const room = delve ? currentRoom(delve) : null;

  // Footstep on room transition — fires whenever `currentRoomIdx` increments.
  const lastRoomIdxRef = useRef<number | null>(null);
  useEffect(() => {
    if (!delve) {
      lastRoomIdxRef.current = null;
      return;
    }
    const prev = lastRoomIdxRef.current;
    if (prev !== null && delve.currentRoomIdx > prev) {
      playSfx('footstep');
    }
    lastRoomIdxRef.current = delve.currentRoomIdx;
  }, [delve?.currentRoomIdx, delve]);

  // Spawn combat on entering a combat/boss room.
  useEffect(() => {
    if (!delve || !character || !room) return;
    if (delve.phase !== 'in-room') return;
    if (combat) return; // already in combat
    if (room.kind !== 'combat' && room.kind !== 'boss' && room.kind !== 'elite') return;
    if (!room.monsters) return;
    // Elite nodes wait on the player's risk/reward decision — don't build the
    // fight until they choose to engage (EliteRoom sets delve.eliteEngaged).
    if (room.kind === 'elite' && !delve.eliteEngaged) return;
    const roller = getActiveRoller();
    const monsters = room.monsters.flatMap((m) =>
      Array.from({ length: m.count }, (_, idx) => {
        const def = getMonster(m.defId);
        const displayName = m.count > 1
          ? `${m.displayPrefix ?? def.name} ${String.fromCharCode(65 + idx)}`
          : def.name;
        return { def, displayName };
      })
    );

    const fresh = withResetActionEconomy(character);
    const newCombat = createCombat({
      roller,
      character: fresh,
      monsters,
      ascension: delve.ascensionLevel ?? 0,
      isBoss: room.kind === 'boss',
      isElite: room.kind === 'elite',
    });
    setCharacter(newCombat.character);
    setCombat(newCombat.state);
    // Codex: unlock each monster type fought.
    const discover = useGameStore.getState().discoverMonster;
    for (const m of room.monsters) {
      discover(m.defId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delve?.currentRoomIdx, delve?.phase, delve?.eliteEngaged]);

  if (!character) {
    return (
      <div className="p-8 text-[var(--color-text-primary)]">
        <p>No character.</p>
        <Button onClick={goToHub}>Hub</Button>
      </div>
    );
  }

  if (!delve) {
    return (
      <div className="min-h-screen p-6 max-w-3xl mx-auto flex flex-col gap-4">
        <Panel>
          <p className="text-[var(--color-text-secondary)] text-sm">
            No active delve. Return to Phandalin.
          </p>
          <div className="mt-3">
            <Button onClick={goToHub}>Return to Phandalin</Button>
          </div>
        </Panel>
      </div>
    );
  }

  // Resolved states first.
  if (delve.phase === 'completed') {
    return (
      <DelveSummary
        delve={delve}
        outcome="completed"
        onReturn={() => finishDelve()}
      />
    );
  }
  if (delve.phase === 'failed') {
    // Postmortem precedes the summary: show what killed the player, then the
    // standard "You Have Fallen" totals, then the reincarnation reveal. The
    // postmortem is cleared when the player advances past it.
    if (postmortem) {
      return (
        <PostmortemModal
          postmortem={postmortem}
          onReincarnate={() => {
            useGameStore.getState().clearPostmortem();
            useGameStore.getState().goToReincarnation();
          }}
        />
      );
    }
    return (
      <DelveSummary
        delve={delve}
        outcome="failed"
        onReturn={() => {
          // Route through the Reincarnation Reveal — the dramatic moment where
          // the new quirks roll in over the painted Druid Grove. The reveal
          // itself calls finishDelve() to land back at Phandalin.
          useGameStore.getState().goToReincarnation();
        }}
      />
    );
  }

  // Between nodes at a branch point: the route map. The player picks the next
  // node, which steps the run back into the in-room phase.
  if (delve.phase === 'between-rooms') {
    return (
      <div key="map" className="animate-fade-in">
        <DelveMap delve={delve} character={character} />
      </div>
    );
  }

  if (!room) {
    return null;
  }

  // Combat in progress: render the combat screen. This fires for combat /
  // boss rooms (spawned by the effect above) AND for event-room ambushes
  // (spawned directly by EventRoom via setCombat).
  if (combat) {
    const isBossRoom = room.kind === 'boss';
    const isEliteRoom = room.kind === 'elite';
    return (
      <div className="flex flex-col">
        <div className="max-w-6xl w-full mx-auto px-6 pt-4">
          <RoomHeader delve={delve} blessingIds={character.blessings} quirkIds={character.quirks} />
        </div>
        <CombatScreen
          character={character}
          state={combat}
          scene={isBossRoom ? 'boss' : 'combat'}
          decoration={decorationForRoom(room, delve.chapterId)}
          roomTitle={room.title.toUpperCase()}
          roomLabel={`${isBossRoom ? 'Boss · ' : isEliteRoom ? 'Elite · ' : ''}Round ${combat.round}`}
          onAbandon={() => useGameStore.getState().abandonDelve()}
          onCombatResolved={(outcome) => {
            if (outcome === 'victory') {
              resolveRoomVictory(room);
            } else {
              setCombat(null);
              useGameStore.getState().showTaunt('irenicus', 'death');
              failDelve();
            }
          }}
        />
      </div>
    );
  }

  // Elite node: the risk/reward decision shown before the fight. Renders until
  // the player engages (Fight) or takes the gold and advances past the node.
  if (room.kind === 'elite' && !delve.eliteEngaged) {
    return (
      <div key={room.id} className="animate-room-enter">
        <DelveTopBar delve={delve} character={character} />
        <EliteRoom room={room} />
      </div>
    );
  }

  // Combat / elite / boss room without a combat yet — render the loading
  // placeholder while the spawn-on-enter effect builds the encounter.
  if (room.kind === 'combat' || room.kind === 'boss' || room.kind === 'elite') {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-[var(--color-text-dim)] text-sm uppercase tracking-widest animate-pulse">
          Preparing encounter...
        </div>
      </div>
    );
  }

  if (room.kind === 'rest') {
    return (
      <div key={room.id} className="animate-room-enter">
        <DelveTopBar delve={delve} character={character} />
        <RestRoom room={room} onContinue={() => advanceRoom()} />
      </div>
    );
  }

  if (room.kind === 'treasure') {
    return (
      <div key={room.id} className="animate-room-enter">
        <DelveTopBar delve={delve} character={character} />
        <TreasureRoom room={room} onContinue={() => advanceRoom()} />
      </div>
    );
  }

  if (room.kind === 'shrine') {
    return (
      <div key={room.id} className="animate-room-enter">
        <DelveTopBar delve={delve} character={character} />
        <ShrineRoom room={room} onContinue={() => advanceRoom()} />
      </div>
    );
  }

  if (room.kind === 'shop') {
    return (
      <div key={room.id} className="animate-room-enter">
        <DelveTopBar delve={delve} character={character} />
        <ShopRoom room={room} onContinue={() => advanceRoom()} />
      </div>
    );
  }

  if (room.kind === 'event') {
    return (
      <div key={room.id} className="animate-room-enter">
        <DelveTopBar delve={delve} character={character} />
        <EventRoom
          room={room}
          onContinue={() => advanceRoom()}
          onAmbush={(monsterDefIds) => {
            const roller = getActiveRoller();
            const fresh = withResetActionEconomy(character);
            const totals: Record<string, number> = {};
            for (const id of monsterDefIds) totals[id] = (totals[id] ?? 0) + 1;
            const seen: Record<string, number> = {};
            const monsters = monsterDefIds.map((defId) => {
              const def = getMonster(defId);
              const idx = seen[defId] ?? 0;
              seen[defId] = idx + 1;
              const displayName = totals[defId] > 1
                ? `${def.name} ${String.fromCharCode(65 + idx)}`
                : def.name;
              return { def, displayName };
            });
            const newCombat = createCombat({
              roller,
              character: fresh,
              monsters,
              ascension: delve.ascensionLevel ?? 0,
            });
            setCharacter(newCombat.character);
            setCombat(newCombat.state);
            const discover = useGameStore.getState().discoverMonster;
            for (const id of monsterDefIds) discover(id);
          }}
        />
      </div>
    );
  }

  if (room.kind === 'camp') {
    return (
      <div key={room.id} className="animate-room-enter">
        <div className="max-w-3xl w-full mx-auto px-6 pt-4">
          <RoomHeader delve={delve} blessingIds={character.blessings} quirkIds={character.quirks} />
        </div>
        <CampRoom
          room={room}
          onPressSouth={() => advanceRoom()}
        />
      </div>
    );
  }

  return null;
}

/**
 * Header for the safe (non-combat) rooms: the room status line plus a Pack
 * button so weapons bought at camp or found on the road can be equipped
 * mid-delve. Returns to the same room (the delve is untouched). Not rendered
 * during combat — no rummaging mid-fight.
 */
function DelveTopBar({
  delve,
  character,
}: {
  delve: DelveState;
  character: Character;
}) {
  const goToInventory = useGameStore((s) => s.goToInventory);
  return (
    <div className="max-w-3xl w-full mx-auto px-6 pt-4">
      <RoomHeader delve={delve} blessingIds={character.blessings} quirkIds={character.quirks} />
      <div className="flex justify-end mt-2">
        <Button variant="ghost" onClick={goToInventory}>
          ◆ Open Pack
        </Button>
      </div>
    </div>
  );
}

/**
 * Post-fight loot pane: everything the cleared fight dropped — gold, xp, each
 * rolled item, and any legendary banked to the reliquary. Self-contained (reads
 * the facade), mounted once above every delve branch. Auto-dismisses; "Open
 * pack" jumps to the inventory to equip the haul.
 */
function LootPane() {
  const lastLoot = useGameStore((s) => s.lastLoot);
  const clearLastLoot = useGameStore((s) => s.clearLastLoot);
  const goToInventory = useGameStore((s) => s.goToInventory);

  useEffect(() => {
    if (!lastLoot) return;
    const t = setTimeout(() => clearLastLoot(), 8000);
    return () => clearTimeout(t);
  }, [lastLoot, clearLastLoot]);

  if (!lastLoot) return null;
  const hasItems = lastLoot.items.length > 0 || lastLoot.bankedLegendary != null;
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 animate-room-enter w-[min(92vw,22rem)]">
      <div className="bg-[var(--color-bg-panel)] border-2 border-[var(--color-accent-amber)] shadow-[0_4px_22px_rgba(0,0,0,0.65)]">
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--color-border-dim)]">
          <span className="font-display text-[10px] uppercase tracking-[0.3em] text-[var(--color-accent-amber)]">
            ◆ Spoils
          </span>
          <button
            type="button"
            onClick={clearLastLoot}
            className="text-[var(--color-text-dim)] hover:text-[var(--color-text-primary)] text-xs leading-none"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
        <div className="px-3 py-2 space-y-1">
          {(lastLoot.gold > 0 || lastLoot.xp > 0) && (
            <div className="flex gap-4 font-mono text-xs">
              {lastLoot.gold > 0 && (
                <span className="text-[var(--color-accent-gold)]">◈ +{lastLoot.gold} gold</span>
              )}
              {lastLoot.xp > 0 && (
                <span className="text-[var(--color-status-frost)]">✦ +{lastLoot.xp} xp</span>
              )}
            </div>
          )}
          {lastLoot.items.map((it, i) => (
            <div
              key={`${it.name}-${i}`}
              className="flex items-center gap-2 font-display uppercase tracking-wider text-[11px]"
              style={{ color: GEAR_RARITY_COLOR[it.rarity] }}
            >
              <span>◆</span>
              <span className="truncate">{it.name}</span>
              <span className="text-[9px] tracking-widest opacity-70 shrink-0">
                {GEAR_RARITY_LABEL[it.rarity]}
              </span>
            </div>
          ))}
          {lastLoot.bankedLegendary && (
            <div className="text-[11px] leading-snug text-[var(--color-accent-gold)]">
              ✦ {lastLoot.bankedLegendary}
              <span className="block text-[9px] uppercase tracking-widest text-[var(--color-text-dim)]">
                banked — attune it at the hub
              </span>
            </div>
          )}
        </div>
        {hasItems && (
          <button
            type="button"
            onClick={() => {
              clearLastLoot();
              goToInventory();
            }}
            className="w-full px-3 py-1.5 border-t border-[var(--color-border-dim)] text-[10px] uppercase tracking-[0.3em] text-[var(--color-accent-amber)] hover:bg-[var(--color-bg-panel-hover)]"
          >
            Open pack →
          </button>
        )}
      </div>
    </div>
  );
}

