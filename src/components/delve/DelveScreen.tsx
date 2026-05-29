import { useEffect, useRef } from 'react';
import type { Character } from '../../types/character';
import type { DelveState, RoomSpec } from '../../types/delve';
import type { MonsterAction } from '../../schemas/monster';
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
import { DelveMap } from './DelveMap';
import { DelveSummary } from './DelveSummary';
import { PostmortemModal } from './PostmortemModal';
import { RoomHeader } from './RoomHeader';
import { Button } from '../ui/Button';
import { Panel } from '../ui/Panel';

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
    }
  }
  const roomId = room.id;
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
    // Eyes of the Lich (camp boon): pause boss combat-spawn while the player
    // reads the stat-block preview. The pre-fight panel clears the flag and
    // re-fires this effect.
    if (room.kind === 'boss' && delve.lichEyesAvailable) return;

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

  // Eyes of the Lich (camp boon): pre-fight stat block preview before the
  // spawn-on-enter effect builds the encounter. Cleared by the "Begin" button.
  if (
    room.kind === 'boss' &&
    delve.lichEyesAvailable &&
    !combat &&
    room.monsters &&
    room.monsters.length > 0
  ) {
    return (
      <div key={room.id} className="animate-room-enter">
        <div className="max-w-3xl w-full mx-auto px-6 pt-4">
          <RoomHeader delve={delve} blessingIds={character.blessings} quirkIds={character.quirks} />
        </div>
        <LichEyesPreview
          bossDefId={room.monsters[0].defId}
          onContinue={() => useGameStore.getState().consumeLichEyes()}
        />
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

function LichEyesPreview({
  bossDefId,
  onContinue,
}: {
  bossDefId: string;
  onContinue: () => void;
}) {
  const def = getMonster(bossDefId);
  const stat = (label: string, value: string | number) => (
    <div className="flex justify-between border-b border-[var(--color-border-dim)] py-1">
      <span className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest">
        {label}
      </span>
      <span className="text-[var(--color-text-primary)] font-mono text-xs">{value}</span>
    </div>
  );
  return (
    <div className="min-h-screen p-6 max-w-3xl mx-auto flex flex-col gap-6">
      <Panel className="bg-gradient-to-br from-[#1e1a2a] to-[#0b0813] border-[var(--color-accent-amber)]">
        <div className="text-[var(--color-accent-amber)] text-xs uppercase tracking-widest mb-2">
          ◆ Eyes of the Lich
        </div>
        <p className="text-[var(--color-text-secondary)] text-xs italic mb-4 leading-relaxed">
          A glance behind eyes that have long ceased to blink. You see the
          measure of what waits.
        </p>
        <div className="border border-[var(--color-border-warm)] p-4">
          <div className="font-display text-lg text-[var(--color-accent-amber)] uppercase tracking-[0.15em] mb-1">
            {def.name}
          </div>
          <div className="text-[var(--color-text-dim)] text-[10px] uppercase tracking-widest italic mb-3">
            {def.creatureType} · CR {def.cr}
          </div>
          {stat('AC', def.ac)}
          {stat('HP', `${def.maxHp}`)}
          {stat('Speed', `${def.speed} ft`)}
          {stat(
            'STR / DEX / CON',
            `${def.abilityScores.str ?? 10} / ${def.abilityScores.dex ?? 10} / ${def.abilityScores.con ?? 10}`,
          )}
          {stat(
            'INT / WIS / CHA',
            `${def.abilityScores.int ?? 10} / ${def.abilityScores.wis ?? 10} / ${def.abilityScores.cha ?? 10}`,
          )}
          {def.resistances && def.resistances.length > 0 &&
            stat('Resistances', def.resistances.join(', '))}
          {def.immunities && def.immunities.length > 0 &&
            stat('Immunities', def.immunities.join(', '))}
          {def.vulnerabilities && def.vulnerabilities.length > 0 &&
            stat('Vulnerabilities', def.vulnerabilities.join(', '))}
          <div className="mt-3 space-y-2">
            {def.actions.map((a, idx) => (
              <div key={idx} className="text-[11px] text-[var(--color-text-primary)] leading-relaxed">
                <span className="text-[var(--color-accent-amber)] uppercase tracking-widest">
                  {a.name}
                </span>{' '}
                {monsterActionPreview(a)}
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-center mt-4">
          <Button variant="primary" onClick={onContinue}>
            I have seen enough →
          </Button>
        </div>
      </Panel>
    </div>
  );
}

/** Compact one-line summary of a monster action for the pre-boss intel sheet. */
function monsterActionPreview(a: MonsterAction): string {
  switch (a.kind) {
    case 'attack':
      return `· +${a.attackBonus} to hit, ${a.damage} ${a.damageType}`;
    case 'paralyze':
      return `· DC ${a.saveDC} ${a.saveAbility.toUpperCase()} save, paralyze ${a.durationRounds}r`;
    case 'debuff':
      return `· DC ${a.saveDC} ${a.saveAbility.toUpperCase()} save, ${a.condition} ${a.durationRounds}r`;
    case 'summon': {
      let name = a.summonDefId;
      try {
        name = getMonster(a.summonDefId).name;
      } catch {
        /* unknown id — show the raw id */
      }
      return `· summons ${a.count ?? 1}× ${name}`;
    }
    case 'sustain': {
      const bits: string[] = [];
      if (a.heal) bits.push(`heals ${a.heal}`);
      if (a.wardTempHp !== undefined) bits.push(`wards +${a.wardTempHp}`);
      return `· ${bits.join(', ') || 'sustains'}`;
    }
    case 'multiattack':
      return `· ${a.attacks} attacks/turn`;
  }
}
