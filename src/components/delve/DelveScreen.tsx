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
import { combatShouldSpawn } from './combatSpawn';
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
import { useT } from '../../i18n/useT';

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
  return <DelveScreenBody />;
}

function DelveScreenBody() {
  const { t, tc, lr } = useT();
  const character = useGameStore((s) => s.character);
  const delve = useGameStore((s) => s.delve);
  const combat = useGameStore((s) => s.combat);
  // An active dialogue (lore beat / soul-voice taunt) holds the next fight: while
  // one is up we don't build combat, so the dialogue plays BEFORE the room's
  // combat + first-combat coach instead of stacking over them.
  const taunt = useGameStore((s) => s.taunt);
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
    // One predicate owns the spawn decision — including the dialogue HOLD: while a
    // lore beat / taunt is up (`taunt !== null`) combat is not built, so the
    // dialogue precedes the fight and the coach. Re-runs (taunt is in the deps)
    // the moment the dialogue clears, and the held fight builds then.
    if (
      !combatShouldSpawn({
        phase: delve.phase,
        hasCombat: combat !== null,
        roomKind: room.kind,
        hasMonsters: room.monsters !== undefined,
        eliteEngaged: delve.eliteEngaged === true,
        dialogueActive: taunt !== null,
      })
    ) {
      return;
    }
    const roller = getActiveRoller();
    // combatShouldSpawn already guaranteed monsters; the fallback is only here to
    // narrow the optional for TypeScript.
    const roomMonsters = room.monsters ?? [];
    const monsters = roomMonsters.flatMap((m) =>
      Array.from({ length: m.count }, (_, idx) => {
        const def = getMonster(m.defId);
        const localizedName = tc('monsters', m.defId, 'name', def.name);
        const displayName = m.count > 1
          ? `${m.displayPrefix ?? localizedName} ${String.fromCharCode(65 + idx)}`
          : localizedName;
        return { def, displayName, statMult: m.statMult };
      })
    );

    const fresh = withResetActionEconomy(character);
    const newCombat = createCombat({
      roller,
      character: fresh,
      monsters,
      ascension: delve.ascensionLevel ?? 0,
      chapter: room.chapter ?? 0,
      isBoss: room.kind === 'boss',
      isElite: room.kind === 'elite',
      twistId: room.twistId,
    });
    setCharacter(newCombat.character);
    setCombat(newCombat.state);
    // Codex: unlock each monster type fought.
    const discover = useGameStore.getState().discoverMonster;
    for (const m of roomMonsters) {
      discover(m.defId);
    }
    // taunt is a dep so the held fight builds the moment the dialogue clears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delve?.currentRoomIdx, delve?.phase, delve?.eliteEngaged, taunt]);

  if (!character) {
    return (
      <div className="p-8 text-[var(--color-text-primary)]">
        <p>{t('delve.screen.noCharacter')}</p>
        <Button onClick={goToHub}>{t('delve.screen.hub')}</Button>
      </div>
    );
  }

  if (!delve) {
    return (
      <div className="min-h-screen p-6 max-w-3xl mx-auto flex flex-col gap-4">
        <Panel>
          <p className="text-[var(--color-text-secondary)] text-sm">
            {t('delve.screen.noDelve')}
          </p>
          <div className="mt-3">
            <Button onClick={goToHub}>{t('delve.screen.returnToTown')}</Button>
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
          // itself calls finishDelve() to land back at Wakeford.
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
        <div className="max-w-6xl w-full mx-auto px-4 md:px-6 pt-4">
          <RoomHeader delve={delve} blessingIds={character.blessings} quirkIds={character.quirks} />
        </div>
        <CombatScreen
          character={character}
          state={combat}
          scene={isBossRoom ? 'boss' : isEliteRoom ? 'elite' : 'combat'}
          chapter={room.chapter ?? 0}
          decoration={decorationForRoom(room, delve.chapterId)}
          roomTitle={lr(room.chapter, room.title).toUpperCase()}
          roomLabel={`${isBossRoom ? t('delve.screen.bossPrefix') : isEliteRoom ? t('delve.screen.elitePrefix') : ''}${t('delve.screen.round', { n: combat.round })}`}
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
          {t('delve.screen.preparing')}
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
              chapter: room.chapter ?? 0,
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
        <div className="max-w-3xl w-full mx-auto px-4 md:px-6 pt-4">
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
  const { t } = useT();
  const goToInventory = useGameStore((s) => s.goToInventory);
  return (
    <div className="max-w-3xl w-full mx-auto px-4 md:px-6 pt-4">
      <RoomHeader delve={delve} blessingIds={character.blessings} quirkIds={character.quirks} />
      <div className="flex justify-end mt-2">
        <Button variant="ghost" onClick={goToInventory}>
          {t('delve.common.openPack')}
        </Button>
      </div>
    </div>
  );
}


