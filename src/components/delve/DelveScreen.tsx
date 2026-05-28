import { useEffect, useRef } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { currentRoom } from '../../engine/delve';
import { createCombat } from '../../engine/combat';
import { rollRoomGoldDrops } from '../../engine/combat/goldDrop';
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
import { DelveSummary } from './DelveSummary';
import { RoomHeader } from './RoomHeader';
import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';

function decorationForRoom(roomId: string, chapterId: string): BattlefieldDecoration {
  // Godwake chained delve: 37 rooms across four chapters.
  //   Ch1 Iron Cells: rooms 1-10 (boss at room-10)
  //   Camp 1: room-11
  //   Ch2 Athkatla: rooms 12-19 (boss at room-19)
  //   Camp 2: room-20
  //   Ch3 Spellhold: rooms 21-28 (boss at room-28)
  //   Camp 3: room-29
  //   Ch4 Ust Natha: rooms 30-37 (boss at room-37)
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
  const character = useGameStore((s) => s.character);
  const delve = useGameStore((s) => s.delve);
  const combat = useGameStore((s) => s.combat);
  const setCombat = useGameStore((s) => s.setCombat);
  const setCharacter = useGameStore((s) => s.setCharacter);
  const goToHub = useGameStore((s) => s.goToHub);
  const advanceRoom = useGameStore((s) => s.advanceRoom);
  const addDelveReward = useGameStore((s) => s.addDelveReward);
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
    if (room.kind !== 'combat' && room.kind !== 'boss') return;
    if (!room.monsters) return;

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
    });
    setCharacter(newCombat.character);
    setCombat(newCombat.state);
    // Codex: unlock each monster type fought.
    const discover = useGameStore.getState().discoverMonster;
    for (const m of room.monsters) {
      discover(m.defId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [delve?.currentRoomIdx, delve?.phase]);

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

  if (!room) {
    return null;
  }

  // Combat in progress: render the combat screen. This fires for combat /
  // boss rooms (spawned by the effect above) AND for event-room ambushes
  // (spawned directly by EventRoom via setCombat).
  if (combat) {
    const isBossRoom = room.kind === 'boss';
    return (
      <div className="flex flex-col">
        <div className="max-w-6xl w-full mx-auto px-6 pt-4">
          <RoomHeader delve={delve} blessingIds={character.blessings} quirkIds={character.quirks} />
        </div>
        <CombatScreen
          character={character}
          state={combat}
          scene={isBossRoom ? 'boss' : 'combat'}
          decoration={decorationForRoom(room.id, delve.chapterId)}
          roomTitle={room.title.toUpperCase()}
          roomLabel={`${isBossRoom ? 'Boss · ' : ''}Round ${combat.round}`}
          onAbandon={() => useGameStore.getState().abandonDelve()}
          onCombatResolved={(outcome) => {
            if (outcome === 'victory') {
              const isRegularCombat = room.kind === 'combat' || room.kind === 'boss';
              if (isRegularCombat) {
                const roomGold = room.goldReward ?? 0;
                const xpDrop = room.xpReward ?? 0;
                // Per-monster CR-scaled gold drops, on top of any fixed
                // room-level goldReward. Computed from the room's monster
                // pool (each instance drops independently).
                const monsterDefIds = (room.monsters ?? []).flatMap((m) =>
                  Array.from({ length: m.count }, () => m.defId),
                );
                const mobGold = rollRoomGoldDrops(getActiveRoller(), monsterDefIds);
                let goldDrop = roomGold + mobGold;
                // Boss intel "walk past" reward: +5% gold from that specific boss.
                if (room.kind === 'boss') {
                  const bossDefId = room.monsters?.[0]?.defId;
                  if (
                    bossDefId &&
                    character.boldApproachBosses?.includes(bossDefId)
                  ) {
                    goldDrop = Math.floor(goldDrop * 1.05);
                  }
                }
                if (goldDrop || xpDrop) addDelveReward(goldDrop, xpDrop);
              }
              setCombat(null);
              advanceRoom();
              // Imoen whispers on the FIRST cleared room of the run.
              const d = useGameStore.getState().delve;
              if (d && d.roomsCleared === 0) {
                useGameStore.getState().showTaunt('imoen', 'first-blood');
              }
              // Irenicus taunts after a boss clear. Delay so the victory
              // beat lands before the overlay steals the moment.
              if (isBossRoom) {
                setTimeout(() => {
                  useGameStore.getState().showTaunt('irenicus', 'chapter-clear');
                }, 1500);
                useGameStore.getState().creditChapterClearGold();
              }
              // Chained Godwake delve: Ilyich is the Ch1 boss at room-10,
              // not the final. Flag the kill so the chapter1Cleared flip
              // survives a subsequent death deeper in the run.
              if (room.id === 'room-10' && delve.chapterId === 'godwake') {
                useGameStore.getState().markChapter1BossKilled();
              }
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

  // Combat / boss room without a combat yet — render the loading placeholder
  // while the spawn-on-enter effect builds the encounter.
  if (room.kind === 'combat' || room.kind === 'boss') {
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
        <div className="max-w-3xl w-full mx-auto px-6 pt-4">
          <RoomHeader delve={delve} blessingIds={character.blessings} quirkIds={character.quirks} />
        </div>
        <RestRoom room={room} onContinue={() => advanceRoom()} />
      </div>
    );
  }

  if (room.kind === 'treasure') {
    return (
      <div key={room.id} className="animate-room-enter">
        <div className="max-w-3xl w-full mx-auto px-6 pt-4">
          <RoomHeader delve={delve} blessingIds={character.blessings} quirkIds={character.quirks} />
        </div>
        <TreasureRoom room={room} onContinue={() => advanceRoom()} />
      </div>
    );
  }

  if (room.kind === 'shrine') {
    return (
      <div key={room.id} className="animate-room-enter">
        <div className="max-w-3xl w-full mx-auto px-6 pt-4">
          <RoomHeader delve={delve} blessingIds={character.blessings} quirkIds={character.quirks} />
        </div>
        <ShrineRoom room={room} onContinue={() => advanceRoom()} />
      </div>
    );
  }

  if (room.kind === 'event') {
    return (
      <div key={room.id} className="animate-room-enter">
        <div className="max-w-3xl w-full mx-auto px-6 pt-4">
          <RoomHeader delve={delve} blessingIds={character.blessings} quirkIds={character.quirks} />
        </div>
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
            const newCombat = createCombat({ roller, character: fresh, monsters });
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
          onMakeForPhandalin={() => useGameStore.getState().concludeDelveAtCamp()}
        />
      </div>
    );
  }

  return null;
}
