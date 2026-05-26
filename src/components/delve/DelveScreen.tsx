import { useEffect } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { currentRoom } from '../../engine/delve';
import { createCombat } from '../../engine/combat';
import { getActiveRoller } from '../../engine/dice';
import { withResetActionEconomy } from '../../engine/character/actions';
import { getMonster } from '../../content/monsters';
import { CombatScreen } from '../combat/CombatScreen';
import type { BattlefieldDecoration } from '../combat/Battlefield';
import { RestRoom } from './RestRoom';
import { TreasureRoom } from './TreasureRoom';
import { ShrineRoom } from './ShrineRoom';
import { DelveSummary } from './DelveSummary';
import { RoomHeader } from './RoomHeader';
import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';

function decorationForRoom(roomId: string): BattlefieldDecoration {
  switch (roomId) {
    case 'room-1':
    case 'room-3':
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
    setCharacter(fresh);
    const newCombat = createCombat({
      roller,
      character: fresh,
      monsters,
    });
    setCombat(newCombat);
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
          // For now: reset HP, drop rewards, return to hub. Reincarnation flow lands later.
          finishDelve();
        }}
      />
    );
  }

  if (!room) {
    return null;
  }

  // Combat / boss rooms: render the combat screen if we have a combat in progress.
  if (room.kind === 'combat' || room.kind === 'boss') {
    if (!combat) {
      return (
        <div className="min-h-screen p-6 flex items-center justify-center">
          <div className="text-[var(--color-text-dim)] text-sm uppercase tracking-widest animate-pulse">
            Preparing encounter...
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col">
        <div className="max-w-6xl w-full mx-auto px-6 pt-4">
          <RoomHeader delve={delve} />
        </div>
        <CombatScreen
          character={character}
          state={combat}
          scene={room.kind === 'boss' ? 'boss' : 'combat'}
          decoration={decorationForRoom(room.id)}
          roomTitle={room.title.toUpperCase()}
          roomLabel={`${room.kind === 'boss' ? 'Boss · ' : ''}Round ${combat.round}`}
          onAbandon={() => useGameStore.getState().abandonDelve()}
          onCombatResolved={(outcome) => {
            if (outcome === 'victory') {
              if (room.xpReward) addDelveReward(0, room.xpReward);
              setCombat(null);
              advanceRoom();
              // Imoen whispers on the FIRST cleared room of the run.
              const d = useGameStore.getState().delve;
              if (d && d.roomsCleared === 0) {
                useGameStore.getState().showTaunt('imoen', 'first-blood');
              }
              // Irenicus taunts after a boss clear.
              if (room.kind === 'boss') {
                useGameStore.getState().showTaunt('irenicus', 'chapter-clear');
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

  if (room.kind === 'rest') {
    return (
      <div>
        <div className="max-w-3xl w-full mx-auto px-6 pt-4">
          <RoomHeader delve={delve} />
        </div>
        <RestRoom room={room} onContinue={() => advanceRoom()} />
      </div>
    );
  }

  if (room.kind === 'treasure') {
    return (
      <div>
        <div className="max-w-3xl w-full mx-auto px-6 pt-4">
          <RoomHeader delve={delve} />
        </div>
        <TreasureRoom room={room} onContinue={() => advanceRoom()} />
      </div>
    );
  }

  if (room.kind === 'shrine') {
    return (
      <div>
        <div className="max-w-3xl w-full mx-auto px-6 pt-4">
          <RoomHeader delve={delve} />
        </div>
        <ShrineRoom room={room} onContinue={() => advanceRoom()} />
      </div>
    );
  }

  return null;
}
