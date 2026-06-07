import { useGameStore } from '../stores/gameStore';
import { useCharacterStore } from '../stores/characterStore';
import { useDelveStore } from '../stores/delveStore';
import { useCombatStore } from '../stores/combatStore';
import { useSettingsStore } from '../stores/settingsStore';
import { SAVE_VERSION } from '../stores/persistMigration';

export type FeedbackCategory = 'bug' | 'suggestion';

export interface FeedbackContext {
  appVersion: string;
  locale: string;
  screen: string;
  url: string;
  chapter?: number;
  ascension?: number;
  characterId?: string;
  characterName?: string;
  class?: string;
  subclass?: string;
  level?: number;
  recentLog?: string;
  lastError?: string;
  userAgent: string;
  at: string;
}

/** Whether the feedback feature is wired (the Worker URL is configured). */
export function feedbackEnabled(): boolean {
  return !!import.meta.env.VITE_FEEDBACK_URL;
}

const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? `build-${SAVE_VERSION}`;

// Ring of the last few uncaught errors, so a bug report can carry whatever blew
// up most recently. Installed once on module load — this module is imported by
// the always-mounted feedback button, so listeners attach at app start.
const recentErrors: string[] = [];
function recordError(msg: string) {
  recentErrors.push(msg);
  if (recentErrors.length > 3) recentErrors.shift();
}
if (typeof window !== 'undefined') {
  window.addEventListener('error', (e) => {
    recordError(`${e.message} @ ${e.filename}:${e.lineno}`);
  });
  window.addEventListener('unhandledrejection', (e) => {
    recordError(`unhandled rejection: ${String((e as PromiseRejectionEvent).reason)}`);
  });
}

/** Snapshot whatever the live stores expose, for an auto-attached report context. */
export function collectContext(): FeedbackContext {
  const game = useGameStore.getState();
  const character = useCharacterStore.getState().character;
  const delve = useDelveStore.getState().delve;
  const combat = useCombatStore.getState().combat;
  const locale = useSettingsStore.getState().locale;

  const currentRoom = delve?.rooms?.[delve.currentRoomIdx];
  const recentLog = combat?.log
    ?.slice(-8)
    .map((e) => e.text)
    .join(' | ');

  return {
    appVersion: APP_VERSION,
    locale,
    screen: game.screen,
    url: typeof window !== 'undefined' ? window.location.href : '',
    chapter: currentRoom?.chapter,
    ascension: delve?.ascensionLevel,
    characterId: character?.id,
    characterName: character?.name,
    class: character?.classId,
    subclass: character?.subclassId ?? undefined,
    level: character?.level,
    recentLog: recentLog || undefined,
    lastError: recentErrors.length ? recentErrors.join(' ‖ ') : undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    at: new Date().toISOString(),
  };
}

export interface SubmitResult {
  ok: boolean;
  error?: string;
}

export async function submitFeedback(
  message: string,
  category: FeedbackCategory,
  context: FeedbackContext = collectContext(),
): Promise<SubmitResult> {
  const url = import.meta.env.VITE_FEEDBACK_URL;
  if (!url) return { ok: false, error: 'disabled' };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, category, context }),
    });
    if (res.ok) return { ok: true };
    if (res.status === 429) return { ok: false, error: 'rate-limited' };
    return { ok: false, error: `status ${res.status}` };
  } catch {
    return { ok: false, error: 'network' };
  }
}
