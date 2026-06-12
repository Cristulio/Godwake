import { BACKDROP_GRADE, type BackdropKind } from '../../assets/backdrops/registry';

/**
 * Fraction of the scene occupied by the near-ground floor band. Scenes are
 * authored 160x84 with the wall/floor seam at y66, so the bottom 18 rows are
 * the floor. The parallax near-layer re-composites exactly that strip from
 * the same SVG; keeping a value step (the floor contact line) at the seam in
 * the art is what makes the join invisible while the layers drift apart.
 */
const NEAR_BAND = 18 / 84;

/**
 * The unifying gameplay glow, re-applied ABOVE the scene so every authored
 * backdrop sits under the same warm torch key (upper-left, matching the
 * sprite rim convention) the way the gradient battlefields do. Boss rooms
 * trade the amber key for the blood-red set-piece ambience.
 */
const GLOW_BY_KIND: Record<BackdropKind, string> = {
  combat:
    'radial-gradient(ellipse at 26% 20%, rgba(244,167,66,0.14), transparent 52%), radial-gradient(ellipse at 78% 88%, rgba(31,58,61,0.18), transparent 55%)',
  elite:
    'radial-gradient(ellipse at 26% 20%, rgba(244,167,66,0.14), transparent 52%), radial-gradient(ellipse at 78% 88%, rgba(31,58,61,0.18), transparent 55%)',
  boss:
    'radial-gradient(ellipse at 26% 20%, rgba(181,48,44,0.20), transparent 52%), radial-gradient(ellipse at 78% 88%, rgba(15,5,5,0.40), transparent 55%)',
  event:
    'radial-gradient(ellipse at 26% 20%, rgba(244,167,66,0.10), transparent 52%), radial-gradient(ellipse at 78% 88%, rgba(31,58,61,0.18), transparent 55%)',
};

interface BattlefieldBackdropProps {
  url: string;
  kind: BackdropKind;
}

/**
 * Full-bleed authored scene behind the combatants: a far layer (the whole
 * scene) and a near layer (the same scene's floor strip) drifting at
 * different amplitudes for cheap 2-layer parallax, then the gameplay torch
 * glow and a readability band that darkens the near ground so sprites and
 * HP bars never fight the art. Renders under the battlefield's existing
 * grain/floor/vignette overlays.
 */
export function BattlefieldBackdrop({ url, kind }: BattlefieldBackdropProps) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* far layer — overscanned so the idle drift never exposes the edges */}
      <img
        src={url}
        alt=""
        draggable={false}
        className="absolute animate-backdrop-far"
        style={{ left: '-1%', top: 0, width: '102%', height: '100%', filter: BACKDROP_GRADE }}
      />
      {/* near layer — the floor strip of the same scene, slower drift */}
      <div
        className="absolute inset-x-0 bottom-0 overflow-hidden"
        style={{ height: `${NEAR_BAND * 100}%` }}
      >
        <img
          src={url}
          alt=""
          draggable={false}
          className="absolute animate-backdrop-near"
          style={{
            left: '-1%',
            bottom: 0,
            width: '102%',
            height: `${10000 / (NEAR_BAND * 100)}%`,
            // identical grade to the far layer or the y66 seam becomes visible
            filter: BACKDROP_GRADE,
          }}
        />
      </div>
      <div className="absolute inset-0" style={{ background: GLOW_BY_KIND[kind] }} />
      {/* readability band: quiet, darker near-ground under the sprites */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(6,4,3,0.42) 0%, rgba(6,4,3,0.20) 13%, rgba(6,4,3,0.07) 26%, transparent 38%)',
        }}
      />
    </div>
  );
}
