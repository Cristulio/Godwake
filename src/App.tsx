import { useGameStore } from './stores/gameStore';
import { TitleScreen } from './components/title/TitleScreen';
import { HubScreen } from './components/hub/HubScreen';
import { DelveScreen } from './components/delve/DelveScreen';

function App() {
  const screen = useGameStore((s) => s.screen);

  switch (screen) {
    case 'title':
      return <TitleScreen />;
    case 'hub':
      return <HubScreen />;
    case 'delve':
      return <DelveScreen />;
    case 'reincarnation':
      return <div className="p-8 text-[var(--color-text-primary)]">Reincarnation (TODO)</div>;
    default:
      return <TitleScreen />;
  }
}

export default App;
