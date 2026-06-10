import { useSettingsStore } from '../stores/settingsStore';
import { useGameStore } from '../stores/gameStore';
import { maxUnlockedSpeed } from '../content/upgrades';

/**
 * The EFFECTIVE game-speed multiplier: the persisted setting clamped to the
 * highest Grove-unlocked tier (×2 / ×4 are renown purchases — wheel-quickened /
 * wheel-unbound). This is the single enforcement point: every pacing consumer
 * (combat timers, dice overlays, event/camp rolls) reads this hook instead of
 * the raw setting, so a save that persisted ×4 before the gate existed — or a
 * fresh account that never bought it — runs at its owned ceiling without any
 * migration. The raw setting is left untouched so buying the upgrade later
 * restores the player's chosen speed by itself.
 */
export function useGameSpeed(): 1 | 2 | 4 {
  const raw = useSettingsStore((s) => s.speedMultiplier);
  const unlocked = useGameStore((s) => s.unlockedUpgrades);
  const ceiling = maxUnlockedSpeed(unlocked ?? {});
  return raw <= ceiling ? raw : ceiling;
}
