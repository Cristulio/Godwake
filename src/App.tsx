import { useGameStore } from './stores/gameStore';
import { TitleScreen } from './components/title/TitleScreen';
import { IntroScreen } from './components/title/IntroScreen';
import { HubScreen } from './components/hub/HubScreen';
import { DelveScreen } from './components/delve/DelveScreen';
import { CodexScreen } from './components/codex/CodexScreen';
import { IrenicusTaunt } from './components/lore/IrenicusTaunt';
import { QuirksTutorial } from './components/lore/QuirksTutorial';

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
    case 'intro':
      content = <IntroScreen onComplete={markIntroSeen} />;
      break;
    case 'hub':
      content = <HubScreen />;
      break;
    case 'delve':
      content = <DelveScreen />;
      break;
    case 'codex':
      content = <CodexScreen />;
      break;
    case 'reincarnation':
      content = (
        <div className="p-8 text-[var(--color-text-primary)]">Reincarnation (TODO)</div>
      );
      break;
    default:
      content = <TitleScreen />;
  }

  return (
    <>
      {content}
      {taunt && (
        <IrenicusTaunt
          speaker={taunt.speaker}
          context={taunt.context}
          seed={taunt.seed}
          onDismiss={dismissTaunt}
        />
      )}
      {showQuirksTutorial && <QuirksTutorial onDismiss={markQuirksTutorialSeen} />}
    </>
  );
}

export default App;
