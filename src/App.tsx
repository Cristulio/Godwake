import { useGameStore } from './stores/gameStore';
import { TitleScreen } from './components/title/TitleScreen';
import { IntroScreen } from './components/title/IntroScreen';
import { CharacterCreationScreen } from './components/creation/CharacterCreationScreen';
import { HubScreen } from './components/hub/HubScreen';
import { DruidGroveScreen } from './components/hub/DruidGroveScreen';
import { Chapter2TeaserScreen } from './components/hub/Chapter2TeaserScreen';
import { DelveScreen } from './components/delve/DelveScreen';
import { CodexScreen } from './components/codex/CodexScreen';
import { InventoryScreen } from './components/inventory/InventoryScreen';
import { IrenicusTaunt } from './components/lore/IrenicusTaunt';
import { QuirksTutorial } from './components/lore/QuirksTutorial';
import { ReincarnationReveal } from './components/lore/ReincarnationReveal';
import { LevelUpScreen } from './components/level/LevelUpScreen';

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
    case 'chapter2-teaser':
      content = <Chapter2TeaserScreen />;
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
