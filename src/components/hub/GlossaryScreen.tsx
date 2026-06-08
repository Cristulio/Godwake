import { Panel } from '../ui/Panel';
import { Button } from '../ui/Button';
import { GLOSSARY } from '../../content/glossary';
import { useT } from '../../i18n/useT';

interface GlossaryScreenProps {
  onBack: () => void;
}

/**
 * Spoiler-free reference for the six attributes, the vital + casting stats, and
 * the core mechanics. Content + structure live in `content/glossary.ts`; this
 * just lays it out, localizing each section title / term / description through
 * the `glossary` overlay seam.
 */
export function GlossaryScreen({ onBack }: GlossaryScreenProps) {
  const { t, tc } = useT();

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-4xl mx-auto animate-room-enter">
      <header className="flex flex-wrap gap-2 items-start justify-between mb-4 pb-4 border-b border-[var(--color-border-warm)]">
        <div>
          <h1
            className="font-display text-2xl md:text-3xl text-[var(--color-accent-amber)] tracking-[0.15em]"
            style={{ textShadow: '3px 3px 0 rgba(0,0,0,0.85), 0 0 18px rgba(244,167,66,0.3)' }}
          >
            {t('hub.glossaryScreen.title')}
          </h1>
          <p className="text-[var(--color-text-secondary)] text-xs uppercase tracking-widest mt-1">
            {t('hub.glossaryScreen.subtitle')}
          </p>
        </div>
        <Button variant="ghost" onClick={onBack}>
          {t('hub.glossaryScreen.back')}
        </Button>
      </header>

      <div className="flex flex-col gap-5">
        {GLOSSARY.map((section) => (
          <Panel key={section.id} tone="warm" title={tc('glossary', section.id, 'title', section.title)}>
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
              {section.entries.map((entry) => (
                <div key={entry.id}>
                  <dt className="font-display text-[var(--color-accent-gold)] text-[11px] uppercase tracking-[0.2em] mb-1">
                    {tc('glossary', entry.id, 'term', entry.term)}
                  </dt>
                  <dd className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
                    {tc('glossary', entry.id, 'desc', entry.desc)}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>
        ))}
      </div>

      <div className="flex justify-center mt-6">
        <Button variant="ghost" onClick={onBack}>
          {t('hub.glossaryScreen.back')}
        </Button>
      </div>
    </div>
  );
}
