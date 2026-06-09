/**
 * Time Stop — the wizard's 9th-level "free turns" capstone. The world freezes
 * and the caster takes this many more full turns before any enemy acts. The
 * count lives in a dependency-free leaf module so the spell handler
 * (spells/ninthLevel.ts) and the turn engine (turn.ts) share one source of
 * truth without an import cycle.
 */
export const TIME_STOP_EXTRA_TURNS = 3;
