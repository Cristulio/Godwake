import type { Character } from '../../types/character';
import type { CombatState } from '../../types/combat';
import type { DelveState } from '../../types/delve';
import type { Postmortem } from '../../types/postmortem';
import { getMonster } from '../../content/monsters';

/**
 * Build a snapshot of the moment the player fell. Pure — derives every
 * field from inputs at the time of death so the postmortem screen can quote
 * the killing blow even after the combat state has been torn down.
 *
 * Falls back gracefully when the killer is unknowable (rare: the player
 * dies to a leftover condition tick or a non-attack damage source).
 */
export function buildPostmortem(
  state: CombatState,
  character: Character,
  delve: DelveState | null,
): Postmortem {
  const last = state.lastAttack;
  const lastSave = state.lastSave;

  // Killer: prefer the most recent attack that hit and dealt damage. The
  // monster's instance lives in combatants — find it for the def lookup.
  const killer = last
    ? state.combatants.find((c) => c.id === last.attackerId && c.kind === 'monster')
    : undefined;
  const killerDefId =
    last?.attackerDefId ??
    (killer && killer.kind === 'monster' ? killer.instance.defId : undefined);
  const killerName =
    last?.attackerName ??
    (killer && killer.kind === 'monster' ? killer.instance.displayName : 'Unknown');

  // Save attribution: only quote a failed save if it was unsuccessful AND
  // the player still bore its condition at death (avoids attributing to a
  // shrugged-off Hold Person from earlier in the fight).
  const activeConditionNames = character.conditions.map((c) => c.name);
  const saveStillRelevant = lastSave
    && !lastSave.success
    && activeConditionNames.some((n) => n === 'paralyzed');
  const failedSave = saveStillRelevant && lastSave
    ? {
        sourceName: lastSave.sourceName,
        casterName: lastSave.casterName,
        ability: lastSave.ability,
        dc: lastSave.dc,
        rolled: lastSave.natural,
        mod: lastSave.mod,
      }
    : undefined;

  const roomNumber = delve ? delve.currentRoomIdx + 1 : 0;

  const unspentResources: string[] = [];
  const eco = character.actionEconomy;
  if (!eco.actionUsed) unspentResources.push('Action');
  if (!eco.bonusActionUsed) unspentResources.push('Bonus Action');
  if (!eco.reactionUsed) unspentResources.push('Reaction');
  const r = character.resources;
  if (r.secondWindAvailable) unspentResources.push('Second Wind');
  if ((r.secondWindBonusRemaining ?? 0) > 0)
    unspentResources.push(`Second Wind ×${r.secondWindBonusRemaining}`);
  if ((r.actionSurgeRemaining ?? 0) > 0)
    unspentResources.push(`Action Surge ×${r.actionSurgeRemaining}`);
  if ((r.cunningActionUsesRemaining ?? 0) > 0)
    unspentResources.push(`Cunning Action ×${r.cunningActionUsesRemaining}`);
  const slots = r.spellSlots ?? {};
  const totalSlots =
    (slots[1] ?? 0) + (slots[2] ?? 0) + (slots[3] ?? 0) + (slots[4] ?? 0);
  if (totalSlots > 0) unspentResources.push(`Spell Slots ×${totalSlots}`);
  // Healing potions are tracked by type in the inventory; surface a rough
  // count so the player sees "you could have drunk one."
  const potions = character.inventory.filter((it) =>
    it.itemId?.startsWith('potion-') || it.itemId === 'healing-potion',
  );
  if (potions.length > 0) unspentResources.push(`Potions ×${potions.length}`);

  // Killer display name override: if the instance is still around, use the
  // display name; otherwise fall back to the def's canonical name.
  let resolvedKillerName = killerName;
  if (killerDefId) {
    try {
      const def = getMonster(killerDefId);
      // Prefer the instance display ("Goblin A") over the def name; if no
      // displayName came in via the AttackEvent, fall back to the def name.
      if (!last?.attackerName) resolvedKillerName = def.name;
    } catch {
      /* unknown def — keep whatever we have */
    }
  }

  return {
    killerName: resolvedKillerName,
    killerDefId,
    attackName: last?.weaponName ?? 'an unseen blow',
    damageDealt: last?.damageDealt,
    damageType: last?.damageType,
    crit: !!last?.crit,
    roomNumber,
    dungeonName: delve?.dungeonName ?? '—',
    failedSave,
    activeConditions: activeConditionNames,
    unspentResources,
  };
}
