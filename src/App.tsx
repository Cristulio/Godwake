import { useGameStore } from './stores/gameStore';
import { TitleScreen } from './components/title/TitleScreen';
import { IntroScreen } from './components/title/IntroScreen';
import { HubScreen } from './components/hub/HubScreen';
import { DelveScreen } from './components/delve/DelveScreen';
import { CodexScreen } from './components/codex/CodexScreen';
import { IrenicusTaunt } from './components/lore/IrenicusTaunt';

function App() {
  const screen = useGameStore((s) => s.screen);
  const taunt = useGameStore((s) => s.taunt);
  const dismissTaunt = useGameStore((s) => s.dismissTaunt);
  const markIntroSeen = useGameStore((s) => s.markIntroSeen);

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
    </>
  );
}

export default App;
