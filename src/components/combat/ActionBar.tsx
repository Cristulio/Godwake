import { Button } from '../ui/Button';
import type { Character } from '../../types/character';
import type { CombatState } from '../../types/combat';
import { isPlayerTurn } from '../../engine/combat';
import { characterHasMechanic } from '../../engine/character/derived';
import { RAGE_ROUNDS } from '../../engine/character/actions';
import { getItem } from '../../content/items';
import { slotsAt, canCastSpell } from '../../engine/combat/spells';

interface ActionBarProps {
  character: Character;
  state: CombatState;
  onAttack: () => void;
  onSecondWind: () => void;
  onActionSurge: () => void;
  onPowerAttack: () => void;
  onBrace: () => void;
  onCunningAction: () => void;
  onRage: () => void;
  onRecklessAttack: () => void;
  onCleave: () => void;
  onKnockdown: () => void;
  onHuntersMark: () => void;
  onSpells: () => void;
  onUseItem: () => void;
  onEndTurn: () => void;
}

export function ActionBar({
  character,
  state,
  onAttack,
  onSecondWind,
  onActionSurge,
  onPowerAttack,
  onBrace,
  onCunningAction,
  onRage,
  onRecklessAttack,
  onCleave,
  onKnockdown,
  onHuntersMark,
  onSpells,
  onUseItem,
  onEndTurn,
}: ActionBarProps) {
  const playersTurn = isPlayerTurn(state);
  const active = state.status === 'active';
  // Cunning Action: Dash queues a free swing the player can fire even after
  // the Action is spent.
  const hasBonusAttack = character.bonusAttackAvailable === true;
  const canAttack =
    playersTurn && active && (!character.actionEconomy.actionUsed || hasBonusAttack);

  const isFighter = character.classId === 'fighter';
  const isRogue = character.classId === 'rogue';
  const isWizard = character.classId === 'wizard';
  const isBarbarian = character.classId === 'barbarian';
  const isRanger = character.classId === 'ranger';

  // Multiattack commitment: once a character with Extra Attack has begun their
  // Attack action (a swing down, the action not yet fully spent), every OTHER
  // action is locked until the remaining swing(s) land — no interleaving.
  const hasExtraAttack = characterHasMechanic(character, 'extra-attack');
  const attacksThisTurn = state.playerAttacksThisTurn ?? 0;
  const midMultiattack =
    hasExtraAttack && !character.actionEconomy.actionUsed && attacksThisTurn > 0;

  const secondWindBonus = character.resources.secondWindBonusRemaining ?? 0;
  const secondWindHasCharge =
    character.resources.secondWindAvailable === true || secondWindBonus > 0;
  const secondWindUsable =
    isFighter &&
    secondWindHasCharge &&
    !character.actionEconomy.bonusActionUsed &&
    character.hp.current < character.hp.max;
  const canSecondWind = playersTurn && active && secondWindUsable && !midMultiattack;
  const secondWindCount =
    (character.resources.secondWindAvailable === true ? 1 : 0) + secondWindBonus;

  // Action Surge: free Action this turn — only useful AFTER you've spent
  // your action. Fighter L2+.
  const surgeRemaining = character.resources.actionSurgeRemaining ?? 0;
  const canActionSurge =
    playersTurn &&
    active &&
    isFighter &&
    surgeRemaining > 0 &&
    character.actionEconomy.actionUsed;

  // Fighter Power Attack — a consumable stance declared before the swing (L1).
  // Charges refresh on rest/camp; the button greys out at 0.
  const hasPowerAttack = isFighter && characterHasMechanic(character, 'power-attack');
  const powerAttacking = character.powerAttackActive === true;
  const powerAttackCharges = character.resources.powerAttackChargesRemaining ?? 0;
  const canPowerAttack =
    playersTurn &&
    active &&
    hasPowerAttack &&
    !powerAttacking &&
    powerAttackCharges > 0 &&
    !character.actionEconomy.actionUsed;

  // Fighter Brace — a bonus-action set, once per combat (L3).
  const hasBrace = isFighter && characterHasMechanic(character, 'brace');
  const canBrace =
    playersTurn &&
    active &&
    hasBrace &&
    character.resources.braceAvailable === true &&
    !character.actionEconomy.bonusActionUsed &&
    !midMultiattack;

  const cunningRemaining = character.resources.cunningActionUsesRemaining ?? 0;
  const canCunningAction =
    playersTurn &&
    active &&
    isRogue &&
    cunningRemaining > 0 &&
    !character.actionEconomy.bonusActionUsed;

  // Barbarian Rage (bonus action) — available every combat; disabled while already raging.
  const rageRounds = character.resources.rageRoundsRemaining ?? 0;
  const raging = rageRounds > 0;
  const canRage =
    playersTurn &&
    active &&
    isBarbarian &&
    !raging &&
    !character.actionEconomy.bonusActionUsed;

  // Barbarian Reckless Attack — a free stance declared before the swing.
  const hasReckless = isBarbarian && characterHasMechanic(character, 'reckless-attack');
  const reckless = character.recklessActive === true;
  const canReckless =
    playersTurn && active && hasReckless && !reckless && !character.actionEconomy.actionUsed;

  // Barbarian Cleave — a free rage-gated stance (L3); needs a second foe to bite.
  const liveEnemyCount = state.combatants.filter(
    (c) => c.kind === 'monster' && c.instance.hp.current > 0,
  ).length;
  const hasCleave = isBarbarian && characterHasMechanic(character, 'cleave');
  const cleaving = character.cleaveActive === true;
  const canCleave =
    playersTurn &&
    active &&
    hasCleave &&
    raging &&
    !cleaving &&
    liveEnemyCount >= 2 &&
    !character.actionEconomy.actionUsed;

  // Barbarian Knockdown — a free rage-gated stance, one charge per combat (L7).
  const hasKnockdown = isBarbarian && characterHasMechanic(character, 'knockdown');
  const knockingDown = character.knockdownActive === true;
  const canKnockdown =
    playersTurn &&
    active &&
    hasKnockdown &&
    raging &&
    character.resources.knockdownAvailable === true &&
    !knockingDown &&
    !character.actionEconomy.actionUsed;

  // Ranger Hunter's Mark (bonus action) — brand or re-brand a quarry.
  const isMarkLive =
    state.huntersMarkTargetId != null &&
    state.combatants.some(
      (c) =>
        c.kind === 'monster' &&
        c.id === state.huntersMarkTargetId &&
        c.instance.hp.current > 0,
    );
  // Re-marking is a no-op when the mark already rides the only living foe —
  // there's nowhere to move it. Mirror the AUTO bot's markOnLiveTarget check
  // (CombatScreen:253) so the button is disabled in that case.
  const hasOtherMarkableTarget = state.combatants.some(
    (c) =>
      c.kind === 'monster' &&
      c.instance.hp.current > 0 &&
      c.id !== state.huntersMarkTargetId,
  );
  const canHuntersMark =
    playersTurn &&
    active &&
    isRanger &&
    characterHasMechanic(character, 'hunters-mark') &&
    !character.actionEconomy.bonusActionUsed &&
    (!isMarkLive || hasOtherMarkableTarget);

  const totalSlots =
    slotsAt(character, 1) + slotsAt(character, 2) + slotsAt(character, 3);
  const knownSpells = character.resources.knownSpells ?? [];
  // Button stays open as long as at least one known spell (action, bonus, or
  // reaction) can be cast right now — SpellPicker greys out individual entries.
  const canSpells =
    playersTurn &&
    active &&
    isWizard &&
    knownSpells.some((id) => canCastSpell(character, id).ok);

  const consumableCount = character.inventory.filter((ref) => {
    try {
      return getItem(ref.itemId).kind === 'consumable';
    } catch {
      return false;
    }
  }).length;
  // Gate on action economy by the consumable's own cost. Draughts/charms are
  // bonus-action items, so once the bonus action is spent (e.g. after Hunter's
  // Mark) the button must grey out — useConsumable silently no-ops otherwise.
  const hasUsableConsumable = character.inventory.some((ref) => {
    let item;
    try {
      item = getItem(ref.itemId);
    } catch {
      return false;
    }
    if (item.kind !== 'consumable') return false;
    // Rage locks out healing — a raging barbarian can't drink a draught.
    if (raging && item.effect === 'heal') return false;
    return item.actionCost === 'bonus'
      ? !character.actionEconomy.bonusActionUsed
      : !character.actionEconomy.actionUsed;
  });
  const canUseItem = playersTurn && active && hasUsableConsumable && !midMultiattack;

  const canEndTurn = playersTurn && active && !midMultiattack;

  // Fighter L5 Extra Attack: two swings per Action. Show progress on the
  // button so the player knows the second swing is queued.
  const dashSwingPending = hasBonusAttack && character.actionEconomy.actionUsed;
  const attackLabel = dashSwingPending
    ? '► Attack (Dash)'
    : hasExtraAttack
      ? `► Attack (${Math.min(attacksThisTurn + 1, 2)}/2)`
      : '► Attack';

  // Two-row layout. Row 1 = the heavy hitters (Attack + class-specific
  // actions + Spells when applicable). Row 2 = universal utility (Item /
  // End Turn). Flex with flex-1 so a 2-button row stretches as evenly as a
  // 3-button one — avoids empty grid cells when a class has fewer actions.
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          onClick={onAttack}
          disabled={!canAttack}
          className="flex-1 basis-[calc(50%_-_0.25rem)] sm:basis-0 min-h-[44px] sm:min-h-0"
        >
          {attackLabel}
        </Button>

        {isFighter && (
          <Button
            variant={canSecondWind ? 'primary' : 'secondary'}
            onClick={onSecondWind}
            disabled={!canSecondWind}
            title="Bonus action: heal 1d10 + level. Once per short rest."
            className="flex-1 basis-[calc(50%_-_0.25rem)] sm:basis-0 min-h-[44px] sm:min-h-0"
          >
            Second Wind{secondWindCount > 1 ? ` (${secondWindCount})` : ''}
          </Button>
        )}
        {isFighter && (
          <Button
            variant={canActionSurge ? 'primary' : 'secondary'}
            onClick={onActionSurge}
            disabled={!canActionSurge}
            title="Free Action: regain your action this turn. Once per short rest."
            className="flex-1 basis-[calc(50%_-_0.25rem)] sm:basis-0 min-h-[44px] sm:min-h-0"
          >
            Action Surge{surgeRemaining > 0 && ` (${surgeRemaining})`}
          </Button>
        )}
        {hasPowerAttack && (
          <Button
            variant={canPowerAttack ? 'primary' : 'secondary'}
            onClick={onPowerAttack}
            disabled={!canPowerAttack}
            title="Free, costs 1 charge: this turn's melee swings land for +4 damage, no accuracy cost. Charges refresh on rest."
            className="flex-1 basis-[calc(50%_-_0.25rem)] sm:basis-0 min-h-[44px] sm:min-h-0"
          >
            {powerAttacking ? 'Power Attack ✓' : `Power Attack (${powerAttackCharges})`}
          </Button>
        )}
        {hasBrace && (
          <Button
            variant={canBrace ? 'primary' : 'secondary'}
            onClick={onBrace}
            disabled={!canBrace}
            title="Bonus action, once per combat: set your guard — the next hit you take is blunted by 3 + half your level."
            className="flex-1 basis-[calc(50%_-_0.25rem)] sm:basis-0 min-h-[44px] sm:min-h-0"
          >
            Brace
          </Button>
        )}

        {isRogue && (
          <Button
            variant={canCunningAction ? 'primary' : 'secondary'}
            onClick={onCunningAction}
            disabled={!canCunningAction}
            title="Bonus action: Hide (advantage on next attack), Dash (a quick second strike this turn), or Disengage (2 damage reduction on next incoming hit)."
            className="flex-1 basis-[calc(50%_-_0.25rem)] sm:basis-0 min-h-[44px] sm:min-h-0"
          >
            Cunning Action{cunningRemaining > 0 && ` (${cunningRemaining})`}
          </Button>
        )}

        {isBarbarian && (
          <Button
            variant={canRage ? 'primary' : 'secondary'}
            onClick={onRage}
            disabled={!canRage}
            title={`Bonus action: enter a ${RAGE_ROUNDS}-round battle-fury — physical damage halved, melee hits deal bonus damage, but healing is locked out until the fury ends.`}
            className="flex-1 basis-[calc(50%_-_0.25rem)] sm:basis-0 min-h-[44px] sm:min-h-0"
          >
            {raging ? `Raging (${rageRounds})` : 'Rage'}
          </Button>
        )}
        {hasReckless && (
          <Button
            variant={canReckless ? 'primary' : 'secondary'}
            onClick={onRecklessAttack}
            disabled={!canReckless}
            title="Free: your melee attacks this turn roll with advantage, but attacks against you have advantage until your next turn."
            className="flex-1 basis-[calc(50%_-_0.25rem)] sm:basis-0 min-h-[44px] sm:min-h-0"
          >
            {reckless ? 'Reckless ✓' : 'Reckless'}
          </Button>
        )}
        {hasCleave && (
          <Button
            variant={canCleave ? 'primary' : 'secondary'}
            onClick={onCleave}
            disabled={!canCleave}
            title="Free, while raging: this turn's first melee hit also catches a second enemy for a glancing blow."
            className="flex-1 basis-[calc(50%_-_0.25rem)] sm:basis-0 min-h-[44px] sm:min-h-0"
          >
            {cleaving ? 'Cleave ✓' : 'Cleave'}
          </Button>
        )}
        {hasKnockdown && (
          <Button
            variant={canKnockdown ? 'primary' : 'secondary'}
            onClick={onKnockdown}
            disabled={!canKnockdown}
            title="Free, while raging, once per combat: arm a staggering strike — the next hit knocks the target down and costs it its next turn."
            className="flex-1 basis-[calc(50%_-_0.25rem)] sm:basis-0 min-h-[44px] sm:min-h-0"
          >
            {knockingDown ? 'Knockdown ✓' : 'Knockdown'}
          </Button>
        )}

        {isRanger && (
          <Button
            variant={canHuntersMark ? 'primary' : 'secondary'}
            onClick={onHuntersMark}
            disabled={!canHuntersMark}
            title="Bonus action: brand a target as your quarry — every hit on it deals extra damage. Re-cast to move the mark."
            className="flex-1 basis-[calc(50%_-_0.25rem)] sm:basis-0 min-h-[44px] sm:min-h-0"
          >
            {isMarkLive ? 'Re-mark' : "Hunter's Mark"}
          </Button>
        )}

        {isWizard && (
          <Button
            variant={canSpells ? 'primary' : 'secondary'}
            onClick={onSpells}
            disabled={!canSpells}
            title="Action: pick a prepared spell."
            className="flex-1 basis-[calc(50%_-_0.25rem)] sm:basis-0 min-h-[44px] sm:min-h-0"
          >
            ✦ Spells ({totalSlots})
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={canUseItem ? 'primary' : 'secondary'}
          onClick={onUseItem}
          disabled={!canUseItem}
          className="flex-1 basis-[calc(50%_-_0.25rem)] sm:basis-0 min-h-[44px] sm:min-h-0"
        >
          Item {consumableCount > 0 && `(${consumableCount})`}
        </Button>
        <Button
          variant="secondary"
          onClick={onEndTurn}
          disabled={!canEndTurn}
          className="flex-1 basis-[calc(50%_-_0.25rem)] sm:basis-0 min-h-[44px] sm:min-h-0"
        >
          End Turn
        </Button>
      </div>
    </div>
  );
}
