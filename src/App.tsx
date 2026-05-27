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
const LevelUpScreen = lazy(() =>
  import('./components/level/LevelUpScreen').then((m) => ({ default: m.LevelUpScreen })),
);
const QuirksTutorial = lazy(() =>
  import('./components/lore/QuirksTutorial').then((m) => ({ default: m.QuirksTutorial })),
);
// DelveScreen pulls all combat code + the 1.5k-line MonsterPortrait library.
// Lazy so the title/hub loop loads fast; delve chunk warms when the player
// first descends.
const DelveScreen = lazy(() =>
  import('./components/delve/DelveScreen').then((m) => ({ default: m.DelveScreen })),
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

  // Show the quirks tutorial once: after first death has happened, the taunt
  // has dismissed, and the tutorial hasn't been shown yet.
  const showQuirksTutorial =
    hasReincarnated && !quirksTutorialSeen && !taunt && screen === 'hub';

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
    case 'codex':
      content = <CodexScreen />;
      break;
    case 'inventory':
      content = <InventoryScreen />;
      break;
    case 'reincarnation':
      content = <ReincarnationReveal />;
      break;
    case 'level-up':
      content = <LevelUpScreen />;
      break;
    default:
      content = <TitleScreen />;
  }

  return (
    <div className="crt-scanlines">
      <Suspense fallback={<ScreenFallback />}>{content}</Suspense>
      {taunt && (
        <IrenicusTaunt
          speaker={taunt.speaker}
          context={taunt.context}
          seed={taunt.seed}
          onDismiss={dismissTaunt}
        />
      )}
      {showQuirksTutorial && (
        <Suspense fallback={null}>
          <QuirksTutorial onDismiss={markQuirksTutorialSeen} />
        </Suspense>
      )}
      <SettingsButton />
    </div>
  );
}

export default App;
