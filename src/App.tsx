import { lazy, Suspense } from 'react';
import { useGameStore } from './stores/gameStore';
import { TitleScreen } from './components/title/TitleScreen';
import { HubScreen } from './components/hub/HubScreen';
import { IrenicusTaunt } from './components/lore/IrenicusTaunt';
import { SettingsButton } from './components/ui/SettingsButton';

// Lazy-load screens that aren't on the critical path. Cuts the initial bundle
// and lets Cloudflare serve gameplay faster — the title/hub/delve loop covers
// 90%+ of session time anyway.
const IntroScreen = lazy(() =>
  import('./components/title/IntroScreen').then((m) => ({ default: m.IntroScreen })),
);
const CharacterCreationScreen = lazy(() =>
  import('./components/creation/CharacterCreationScreen').then((m) => ({
    default: m.CharacterCreationScreen,
  })),
);
const DruidGroveScreen = lazy(() =>
  import('./components/hub/DruidGroveScreen').then((m) => ({ default: m.DruidGroveScreen })),
);
const CodexScreen = lazy(() =>
  import('./components/codex/CodexScreen').then((m) => ({ default: m.CodexScreen })),
);
const InventoryScreen = lazy(() =>
  import('./components/inventory/InventoryScreen').then((m) => ({ default: m.InventoryScreen })),
);
const ReincarnationReveal = lazy(() =>
  import('./components/lore/ReincarnationReveal').then((m) => ({
    default: m.ReincarnationReveal,
  })),
);
const EndingScreen = lazy(() =>
  import('./components/lore/EndingScreen').then((m) => ({
    default: m.EndingScreen,
  })),
);
const LevelUpScreen = lazy(() =>
  import('./components/level/LevelUpScreen').then((m) => ({ default: m.LevelUpScreen })),
);
const QuirksTutorial = lazy(() =>
  import('./components/lore/QuirksTutorial').then((m) => ({ default: m.QuirksTutorial })),
);
const UnlockTutorialCard = lazy(() =>
  import('./components/system/UnlockTutorialCard').then((m) => ({
    default: m.UnlockTutorialCard,
  })),
);
// DelveScreen pulls all combat code + the 1.5k-line MonsterPortrait library.
// Lazy so the title/hub loop loads fast; delve chunk warms when the player
// first descends.
const DelveScreen = lazy(() =>
  import('./components/delve/DelveScreen').then((m) => ({ default: m.DelveScreen })),
);
const SpoilsScreen = lazy(() =>
  import('./components/spoils/SpoilsScreen').then((m) => ({ default: m.SpoilsScreen })),
);

function ScreenFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="font-display text-[var(--color-accent-amber)] text-xs uppercase tracking-[0.4em] animate-pulse">
        ◆ Loading
      </div>
    </div>
  );
}

function App() {
  const screen = useGameStore((s) => s.screen);
  const taunt = useGameStore((s) => s.taunt);
  const dismissTaunt = useGameStore((s) => s.dismissTaunt);
  const markIntroSeen = useGameStore((s) => s.markIntroSeen);
  const hasReincarnated = useGameStore((s) => s.hasReincarnated);
  const quirksTutorialSeen = useGameStore((s) => s.quirksTutorialSeen);
  const markQuirksTutorialSeen = useGameStore((s) => s.markQuirksTutorialSeen);
  const tutorialQueue = useGameStore((s) => s.tutorialQueue);
  const dismissTutorial = useGameStore((s) => s.dismissTutorial);

  // Show the quirks tutorial once: after first death has happened, the taunt
  // has dismissed, and the tutorial hasn't been shown yet.
  const showQuirksTutorial =
    hasReincarnated && !quirksTutorialSeen && !taunt && screen === 'hub';

  // Reveal the next unlock tutorial (one at a time, queued on descent). Hold it
  // behind any active taunt so two modals never stack.
  const pendingUnlock = !taunt ? tutorialQueue[0] : undefined;

  let content;
  switch (screen) {
    case 'title':
      content = <TitleScreen />;
      break;
    case 'character-creation':
      content = <CharacterCreationScreen />;
      break;
    case 'intro':
      content = <IntroScreen onComplete={markIntroSeen} />;
      break;
    case 'hub':
      content = <HubScreen />;
      break;
    case 'druid-grove':
      content = <DruidGroveScreen />;
      break;
    case 'delve':
      content = <DelveScreen />;
      break;
    case 'spoils':
      content = <SpoilsScreen />;
      break;
    case 'codex':
      content = <CodexScreen />;
      break;
    case 'inventory':
      content = <InventoryScreen />;
      break;
    case 'reincarnation':
      content = <ReincarnationReveal />;
      break;
    case 'ending':
      content = <EndingScreen />;
      break;
    case 'level-up':
      content = <LevelUpScreen />;
      break;
    default:
      content = <TitleScreen />;
  }

  return (
    <div className="crt-scanlines">
      <Suspense fallback={<ScreenFallback />}>
        {/* Keyed on `screen` so each route change remounts and replays the
            scene fade — the only thing that gives moving between hub/map/
            delve/level-up an intentional beat. Opacity-only (see index.css). */}
        <div key={screen} className="animate-scene-in">
          {content}
        </div>
      </Suspense>
      {taunt && (
        <IrenicusTaunt
          speaker={taunt.speaker}
          context={taunt.context}
          seed={taunt.seed}
          chapter={taunt.chapter}
          line={taunt.line}
          onDismiss={dismissTaunt}
        />
      )}
      {showQuirksTutorial && (
        <Suspense fallback={null}>
          <QuirksTutorial onDismiss={markQuirksTutorialSeen} />
        </Suspense>
      )}
      {pendingUnlock && (
        <Suspense fallback={null}>
          <UnlockTutorialCard featureId={pendingUnlock} onDismiss={dismissTutorial} />
        </Suspense>
      )}
      <SettingsButton />
    </div>
  );
}

export default App;
