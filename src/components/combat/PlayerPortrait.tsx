interface PlayerPortraitProps {
  classId: string;
  className?: string;
}

// ─────────────────────────────────────────────────────────────────────────
// "HD 8-bit" portraits, brought up to the restyled-monster bar (batch 3 —
// bandit-captain / drow-warrior / mirror-of-pride). Same grid + crispEdges +
// viewBox + pose as before; the lift is in the rendering: a warm amber KEY
// crossed with a cool RIM/backlight so each silhouette separates from the dark
// HUD, 4-5 step tonal ramps per material (deep-shadow → base → mid → light →
// rim), 1px dithering at the big tone boundaries, near-white SPECULAR pops on
// metal / blades / eyes, and glowing accent gems (bloom ellipse + bright core)
// to match the monster sparkle. Palette stays BG2-mean: amber torch, deep teal
// shadow, blood, gold, arcane violet.
// ─────────────────────────────────────────────────────────────────────────

export function PlayerPortrait({ classId, className = '' }: PlayerPortraitProps) {
  switch (classId) {
    case 'rogue':
      return <RogueSvg className={className} />;
    case 'wizard':
      return <WizardSvg className={className} />;
    case 'barbarian':
      return <BarbarianSvg className={className} />;
    case 'ranger':
      return <RangerSvg className={className} />;
    case 'druid':
      return <DruidSvg className={className} />;
    case 'monk':
      return <MonkSvg className={className} />;
    case 'bard':
      return <BardSvg className={className} />;
    case 'paladin':
      return <PaladinSvg className={className} />;
    case 'fighter':
    default:
      return <FighterSvg className={className} />;
  }
}

function BardSvg({ className }: { className?: string }) {
  // 36×60. Feathered slouch cap, half-grin, slashed violet doublet, war lute
  // mid-strum with a struck-chord shimmer, particoloured hose. Footlight key.
  return (
    <svg
      viewBox="0 0 36 60"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="Bard"
    >
      {/* Backlight — warm footlight amber + violet stage rim */}
      <ellipse cx="16" cy="26" rx="19" ry="27" fill="#e8a020" opacity="0.10" />
      <ellipse cx="23" cy="23" rx="15" ry="21" fill="#7a5db8" opacity="0.07" />
      <ellipse cx="16" cy="19" rx="12" ry="16" fill="#f4b43a" opacity="0.06" />
      {/* Ground-contact shadow */}
      <ellipse cx="18" cy="58.4" rx="13" ry="2.1" fill="#000" opacity="0.45" />

      {/* ── Plume — teal feather sweeping up-right ── */}
      <rect x="22" y="1" width="3" height="4" fill="#150d08" />
      <rect x="24" y="0" width="3" height="3" fill="#150d08" />
      <rect x="26" y="0" width="3" height="2" fill="#150d08" />
      <rect x="23" y="2" width="1" height="2" fill="#2e6a62" />
      <rect x="24" y="1" width="2" height="1" fill="#3a8a7a" />
      <rect x="26" y="0" width="2" height="1" fill="#6ac4b0" />
      <rect x="27" y="0" width="1" height="1" fill="#a8f0dc" />
      <rect x="25" y="2" width="1" height="1" fill="#3a8a7a" />
      {/* barb notch */}
      <rect x="25" y="1" width="1" height="1" fill="#2e6a62" />

      {/* ── Slouch cap — wine, canted right, gold pin ── */}
      {/* outline */}
      <rect x="12" y="2" width="12" height="2" fill="#150d08" />
      <rect x="11" y="4" width="15" height="4" fill="#150d08" />
      {/* crown slouching right */}
      <rect x="13" y="3" width="10" height="1" fill="#7e1f2c" />
      <rect x="12" y="4" width="13" height="3" fill="#7e1f2c" />
      <rect x="12" y="4" width="4" height="2" fill="#a93340" />
      <rect x="12" y="4" width="2" height="1" fill="#c84a64" />
      <rect x="21" y="4" width="4" height="3" fill="#531320" />
      <rect x="23" y="5" width="2" height="2" fill="#3d0e1a" />
      {/* slouch fold */}
      <rect x="17" y="4" width="1" height="3" fill="#531320" />
      {/* band + gold pin */}
      <rect x="12" y="7" width="13" height="1" fill="#3d0e1a" />
      <rect x="14" y="7" width="1" height="1" fill="#ecc46a" />
      <rect x="14" y="6" width="1" height="1" fill="#fff0b8" />

      {/* ── Face — fair, quick eyes, half-grin ── */}
      <rect x="12" y="8" width="13" height="7" fill="#150d08" />
      <rect x="13" y="8" width="11" height="6" fill="#d4ad78" />
      <rect x="13" y="8" width="11" height="1" fill="#ecd0a0" />
      <rect x="13" y="8" width="3" height="1" fill="#f8e8c4" />
      <rect x="13" y="8" width="1" height="6" fill="#b8905c" />
      <rect x="22" y="8" width="2" height="6" fill="#95714a" />
      {/* bright eyes + violet glint */}
      <rect x="14" y="10" width="3" height="2" fill="#f6ecd8" />
      <rect x="20" y="10" width="3" height="2" fill="#e8d8bc" />
      <rect x="15" y="10" width="2" height="2" fill="#241810" />
      <rect x="21" y="10" width="2" height="2" fill="#241810" />
      <rect x="15" y="10" width="1" height="1" fill="#c4b0f0" />
      <rect x="21" y="10" width="1" height="1" fill="#c4b0f0" />
      {/* raised brow (left) — the performer's arch */}
      <rect x="14" y="9" width="3" height="1" fill="#95714a" />
      <rect x="20" y="8" width="3" height="1" fill="#95714a" />
      {/* nose + half-grin, one corner up */}
      <rect x="18" y="11" width="1" height="2" fill="#b8905c" />
      <rect x="15" y="13" width="5" height="1" fill="#95714a" />
      <rect x="19" y="12" width="2" height="1" fill="#a93340" />
      <rect x="20" y="12" width="1" height="1" fill="#c84a64" />
      {/* hair locks at the jaw */}
      <rect x="12" y="8" width="1" height="6" fill="#6a3a1a" />
      <rect x="24" y="8" width="1" height="6" fill="#4a2810" />
      <rect x="12" y="13" width="2" height="2" fill="#6a3a1a" />
      <rect x="23" y="13" width="2" height="2" fill="#4a2810" />

      {/* ── Lace ruff collar ── */}
      <rect x="12" y="15" width="13" height="3" fill="#150d08" />
      <rect x="13" y="16" width="11" height="1" fill="#e8dcc4" />
      <rect x="13" y="16" width="4" height="1" fill="#f8f2e2" />
      <rect x="13" y="17" width="11" height="1" fill="#cdbfa2" />
      <rect x="14" y="17" width="1" height="1" fill="#e8dcc4" />
      <rect x="17" y="17" width="1" height="1" fill="#e8dcc4" />
      <rect x="20" y="17" width="1" height="1" fill="#e8dcc4" />

      {/* ── Doublet — violet, slashed sleeves, gold buttons ── */}
      <rect x="9" y="18" width="19" height="15" fill="#150d08" />
      <rect x="10" y="19" width="17" height="13" fill="#3a2a5a" />
      <rect x="10" y="19" width="2" height="13" fill="#503d78" />
      <rect x="10" y="19" width="1" height="7" fill="#6a52a0" />
      <rect x="24" y="19" width="3" height="13" fill="#2a1d48" />
      <rect x="26" y="19" width="1" height="13" fill="#221640" />
      <rect x="17" y="19" width="2" height="13" fill="#473570" />
      {/* wine slash panels */}
      <rect x="12" y="20" width="2" height="5" fill="#7e1f2c" />
      <rect x="12" y="20" width="1" height="5" fill="#a93340" />
      <rect x="22" y="21" width="2" height="5" fill="#531320" />
      <rect x="22" y="21" width="1" height="5" fill="#7e1f2c" />
      {/* gold buttons down the center */}
      <rect x="18" y="20" width="1" height="1" fill="#ecc46a" />
      <rect x="18" y="23" width="1" height="1" fill="#c89a48" />
      <rect x="18" y="26" width="1" height="1" fill="#ecc46a" />
      <rect x="18" y="29" width="1" height="1" fill="#c89a48" />

      {/* ── War lute — slung diagonal, mid-strum ── */}
      {/* headstock + pegs upper-left */}
      <rect x="3" y="9" width="5" height="6" fill="#150d08" />
      <rect x="4" y="10" width="3" height="4" fill="#6a3a1a" />
      <rect x="4" y="10" width="1" height="4" fill="#8c5226" />
      {/* tuning pegs */}
      <rect x="2" y="10" width="1" height="1" fill="#ecc46a" />
      <rect x="2" y="12" width="1" height="1" fill="#c89a48" />
      <rect x="7" y="9" width="1" height="1" fill="#ecc46a" />
      {/* neck — diagonal steps down-right */}
      <rect x="5" y="14" width="4" height="3" fill="#150d08" />
      <rect x="6" y="14" width="2" height="2" fill="#8c5226" />
      <rect x="6" y="14" width="1" height="2" fill="#b07434" />
      <rect x="7" y="16" width="4" height="3" fill="#150d08" />
      <rect x="8" y="16" width="2" height="2" fill="#8c5226" />
      <rect x="8" y="16" width="1" height="2" fill="#b07434" />
      <rect x="9" y="18" width="4" height="3" fill="#150d08" />
      <rect x="10" y="18" width="2" height="2" fill="#6a3a1a" />
      <rect x="10" y="18" width="1" height="2" fill="#8c5226" />
      {/* fret glints on the neck */}
      <rect x="6" y="15" width="1" height="1" fill="#d4b062" />
      <rect x="8" y="17" width="1" height="1" fill="#d4b062" />
      {/* rounded body — warm wood, lit soundboard */}
      <rect x="10" y="21" width="15" height="11" fill="#150d08" />
      <rect x="11" y="22" width="13" height="9" fill="#8c5226" />
      <rect x="11" y="22" width="13" height="1" fill="#b07434" />
      <rect x="11" y="22" width="1" height="9" fill="#6a3a1a" />
      <rect x="23" y="22" width="1" height="9" fill="#4a2810" />
      <rect x="11" y="30" width="13" height="1" fill="#4a2810" />
      {/* soundboard */}
      <rect x="13" y="23" width="9" height="7" fill="#a8682e" />
      <rect x="13" y="23" width="9" height="1" fill="#c89048" />
      <rect x="13" y="23" width="4" height="1" fill="#e0b066" />
      <rect x="21" y="24" width="1" height="6" fill="#8c5226" />
      {/* rosette soundhole + gold ring */}
      <rect x="16" y="25" width="3" height="3" fill="#1a0e06" />
      <rect x="15" y="25" width="1" height="3" fill="#d4b062" />
      <rect x="19" y="25" width="1" height="3" fill="#d4b062" />
      <rect x="16" y="24" width="3" height="1" fill="#c89a48" />
      <rect x="16" y="28" width="3" height="1" fill="#9a7232" />
      {/* bridge */}
      <rect x="20" y="29" width="3" height="1" fill="#4a2810" />
      {/* strings — headstock to bridge, catching light */}
      <rect x="7" y="13" width="3" height="1" fill="#e8dcc4" opacity="0.75" />
      <rect x="9" y="15" width="3" height="1" fill="#e8dcc4" opacity="0.6" />
      <rect x="11" y="18" width="3" height="1" fill="#e8dcc4" opacity="0.75" />
      <rect x="13" y="21" width="4" height="1" fill="#e8dcc4" opacity="0.6" />
      <rect x="16" y="24" width="4" height="1" fill="#e8dcc4" opacity="0.75" />
      <rect x="19" y="27" width="3" height="2" fill="#e8dcc4" opacity="0.5" />
      {/* ── struck-chord shimmer ── */}
      <ellipse cx="22" cy="24" rx="6" ry="5" fill="#a48ee0" opacity="0.18" />
      <rect x="25" y="20" width="1" height="1" fill="#d4c4f8" />
      <rect x="27" y="23" width="1" height="1" fill="#c4b0f0" opacity="0.9" />
      <rect x="24" y="18" width="1" height="1" fill="#a48ee0" opacity="0.8" />

      {/* ── Left arm — fretting high on the neck ── */}
      <rect x="8" y="19" width="4" height="3" fill="#150d08" />
      <rect x="9" y="20" width="2" height="1" fill="#3a2a5a" />
      <rect x="5" y="17" width="5" height="4" fill="#150d08" />
      <rect x="6" y="18" width="3" height="2" fill="#3a2a5a" />
      <rect x="6" y="18" width="1" height="2" fill="#503d78" />
      {/* fretting hand */}
      <rect x="4" y="13" width="5" height="5" fill="#150d08" />
      <rect x="5" y="14" width="3" height="3" fill="#d4ad78" />
      <rect x="5" y="14" width="3" height="1" fill="#ecd0a0" />
      <rect x="7" y="15" width="1" height="2" fill="#b8905c" />

      {/* ── Right arm — sweeping the strum ── */}
      <rect x="25" y="19" width="6" height="4" fill="#150d08" />
      <rect x="26" y="20" width="4" height="2" fill="#3a2a5a" />
      <rect x="26" y="20" width="4" height="1" fill="#503d78" />
      {/* wine slashed sleeve */}
      <rect x="27" y="22" width="5" height="5" fill="#150d08" />
      <rect x="28" y="23" width="3" height="3" fill="#7e1f2c" />
      <rect x="28" y="23" width="1" height="3" fill="#a93340" />
      {/* strumming hand — caught mid-sweep off the strings */}
      <rect x="25" y="26" width="5" height="4" fill="#150d08" />
      <rect x="26" y="27" width="3" height="2" fill="#d4ad78" />
      <rect x="26" y="27" width="3" height="1" fill="#ecd0a0" />
      {/* plectrum glint */}
      <rect x="25" y="28" width="1" height="1" fill="#fff0b8" />

      {/* ── Sash — wine, gold buckle ── */}
      <rect x="9" y="31" width="19" height="3" fill="#150d08" />
      <rect x="10" y="32" width="17" height="2" fill="#7e1f2c" />
      <rect x="10" y="32" width="17" height="1" fill="#a93340" />
      <rect x="10" y="32" width="5" height="1" fill="#c84a64" />
      <rect x="17" y="32" width="2" height="2" fill="#c89a48" />
      <rect x="17" y="32" width="1" height="1" fill="#fff0b8" />

      {/* ── Doublet skirt — violet, gold hem ── */}
      <rect x="9" y="34" width="19" height="6" fill="#150d08" />
      <rect x="10" y="35" width="17" height="4" fill="#3a2a5a" />
      <rect x="10" y="35" width="2" height="4" fill="#503d78" />
      <rect x="24" y="35" width="3" height="4" fill="#2a1d48" />
      <rect x="17" y="35" width="2" height="4" fill="#473570" />
      <rect x="10" y="38" width="17" height="1" fill="#c89a48" />
      <rect x="10" y="38" width="6" height="1" fill="#ecc46a" />

      {/* ── Particoloured hose — wine left, violet right ── */}
      <rect x="10" y="40" width="7" height="14" fill="#150d08" />
      <rect x="11" y="41" width="5" height="12" fill="#7e1f2c" />
      <rect x="11" y="41" width="1" height="12" fill="#a93340" />
      <rect x="14" y="41" width="2" height="12" fill="#531320" />
      <rect x="19" y="40" width="7" height="14" fill="#150d08" />
      <rect x="20" y="41" width="5" height="12" fill="#3a2a5a" />
      <rect x="20" y="41" width="1" height="12" fill="#503d78" />
      <rect x="23" y="41" width="2" height="12" fill="#221640" />
      {/* garter ribbons */}
      <rect x="11" y="45" width="5" height="1" fill="#c89a48" />
      <rect x="20" y="45" width="5" height="1" fill="#9a7232" />

      {/* ── Soft boots — tan, folded tops ── */}
      <rect x="9" y="52" width="9" height="6" fill="#150d08" />
      <rect x="10" y="53" width="7" height="4" fill="#4f3722" />
      <rect x="10" y="53" width="7" height="1" fill="#8f6a40" />
      <rect x="10" y="53" width="3" height="1" fill="#a8854e" />
      <rect x="10" y="56" width="7" height="1" fill="#241c12" />
      <rect x="19" y="52" width="9" height="6" fill="#150d08" />
      <rect x="20" y="53" width="7" height="4" fill="#42301e" />
      <rect x="20" y="53" width="7" height="1" fill="#6e4e30" />
      <rect x="20" y="56" width="7" height="1" fill="#1c130c" />
    </svg>
  );
}

function MonkSvg({ className }: { className?: string }) {
  // 36×60. Shaved head with ash mark, bare lean torso, saffron sash + wrap
  // skirt, fist raised in guard with a ki shimmer, wrapped wrists/ankles,
  // bare feet planted wide.
  return (
    <svg
      viewBox="0 0 36 60"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="Monk"
    >
      {/* Backlight — warm saffron key + cool counter-rim */}
      <ellipse cx="16" cy="26" rx="19" ry="27" fill="#c87a2a" opacity="0.11" />
      <ellipse cx="23" cy="23" rx="15" ry="22" fill="#3a6a72" opacity="0.06" />
      <ellipse cx="16" cy="19" rx="12" ry="16" fill="#e8a020" opacity="0.06" />
      {/* Ground-contact shadow */}
      <ellipse cx="18" cy="58.4" rx="13" ry="2.1" fill="#000" opacity="0.45" />

      {/* ── Head — shaved, lit crown, ash mark ── */}
      {/* outline */}
      <rect x="13" y="1" width="11" height="2" fill="#150d08" />
      <rect x="12" y="3" width="13" height="10" fill="#150d08" />
      <rect x="13" y="13" width="11" height="1" fill="#150d08" />
      {/* scalp */}
      <rect x="14" y="2" width="9" height="2" fill="#b8905c" />
      <rect x="14" y="2" width="7" height="1" fill="#d4ad78" />
      <rect x="15" y="2" width="4" height="1" fill="#ecd0a0" />
      <rect x="22" y="2" width="1" height="2" fill="#95714a" />
      {/* face */}
      <rect x="13" y="4" width="11" height="9" fill="#b8905c" />
      <rect x="13" y="4" width="1" height="9" fill="#95714a" />
      <rect x="14" y="4" width="2" height="8" fill="#d4ad78" />
      <rect x="22" y="4" width="2" height="9" fill="#6f5236" />
      <rect x="21" y="4" width="1" height="9" fill="#95714a" />
      {/* ears */}
      <rect x="12" y="6" width="1" height="3" fill="#a8845a" />
      <rect x="24" y="6" width="1" height="3" fill="#6f5236" />
      {/* ash mark — twin bars on the brow */}
      <rect x="17" y="3" width="3" height="1" fill="#5a4630" opacity="0.75" />
      <rect x="17" y="5" width="3" height="1" fill="#5a4630" opacity="0.5" />
      {/* calm focused eyes + amber glint */}
      <rect x="14" y="7" width="3" height="1" fill="#3a2a18" />
      <rect x="20" y="7" width="3" height="1" fill="#3a2a18" />
      <rect x="15" y="7" width="1" height="1" fill="#f4b43a" />
      <rect x="21" y="7" width="1" height="1" fill="#f4b43a" />
      {/* lid shadow above */}
      <rect x="14" y="6" width="3" height="1" fill="#95714a" />
      <rect x="20" y="6" width="3" height="1" fill="#95714a" />
      {/* nose + level mouth */}
      <rect x="18" y="8" width="1" height="2" fill="#95714a" />
      <rect x="16" y="11" width="5" height="1" fill="#8a6a44" />
      {/* jaw */}
      <rect x="14" y="12" width="9" height="1" fill="#95714a" />
      {/* neck */}
      <rect x="15" y="14" width="7" height="2" fill="#95714a" />
      <rect x="15" y="14" width="4" height="1" fill="#b8905c" />

      {/* ── Shoulders — bare, lean ── */}
      <rect x="6" y="15" width="25" height="4" fill="#150d08" />
      <rect x="7" y="16" width="23" height="2" fill="#b8905c" />
      <rect x="7" y="16" width="23" height="1" fill="#d4ad78" />
      <rect x="8" y="16" width="4" height="1" fill="#ecd0a0" />
      <rect x="7" y="17" width="2" height="1" fill="#95714a" />
      <rect x="28" y="16" width="2" height="2" fill="#6f5236" />

      {/* ── Torso — bare, defined; saffron sash across ── */}
      <rect x="8" y="18" width="21" height="12" fill="#150d08" />
      <rect x="9" y="19" width="19" height="10" fill="#b8905c" />
      <rect x="9" y="19" width="2" height="10" fill="#95714a" />
      <rect x="9" y="19" width="1" height="10" fill="#7e6240" />
      <rect x="25" y="19" width="3" height="10" fill="#8a6a44" />
      <rect x="27" y="19" width="1" height="10" fill="#6f5236" />
      {/* lit pec + sternum */}
      <rect x="11" y="19" width="3" height="2" fill="#d4ad78" />
      <rect x="11" y="19" width="2" height="1" fill="#ecd0a0" />
      <rect x="18" y="19" width="1" height="10" fill="#95714a" />
      <rect x="11" y="22" width="5" height="1" fill="#95714a" />
      <rect x="20" y="22" width="5" height="1" fill="#8a6a44" />
      {/* abs */}
      <rect x="13" y="24" width="4" height="1" fill="#95714a" />
      <rect x="20" y="24" width="3" height="1" fill="#8a6a44" />
      <rect x="13" y="26" width="4" height="1" fill="#95714a" />
      <rect x="20" y="26" width="3" height="1" fill="#8a6a44" />
      {/* saffron sash — left shoulder to right hip, folded ── */}
      <rect x="9" y="18" width="5" height="3" fill="#c25a1a" />
      <rect x="11" y="20" width="5" height="3" fill="#e07820" />
      <rect x="14" y="22" width="5" height="3" fill="#c25a1a" />
      <rect x="17" y="24" width="5" height="3" fill="#e07820" />
      <rect x="20" y="26" width="5" height="3" fill="#c25a1a" />
      {/* sash lit fold + deep crease */}
      <rect x="9" y="18" width="2" height="2" fill="#f49a3a" />
      <rect x="10" y="18" width="1" height="1" fill="#ffc878" />
      <rect x="13" y="21" width="1" height="2" fill="#a84818" />
      <rect x="16" y="23" width="1" height="2" fill="#a84818" />
      <rect x="19" y="25" width="1" height="2" fill="#a84818" />
      <rect x="12" y="20" width="1" height="1" fill="#f49a3a" />
      <rect x="18" y="24" width="1" height="1" fill="#f49a3a" />

      {/* ── Right arm — raised guard fist with ki shimmer ── */}
      <rect x="27" y="17" width="6" height="4" fill="#150d08" />
      <rect x="28" y="18" width="4" height="2" fill="#b8905c" />
      <rect x="28" y="18" width="4" height="1" fill="#d4ad78" />
      <rect x="28" y="13" width="6" height="6" fill="#150d08" />
      <rect x="29" y="14" width="4" height="4" fill="#a8845a" />
      <rect x="29" y="14" width="1" height="4" fill="#c29c6a" />
      <rect x="32" y="14" width="1" height="4" fill="#7e6240" />
      {/* wrist wrap */}
      <rect x="28" y="11" width="6" height="3" fill="#150d08" />
      <rect x="29" y="12" width="4" height="2" fill="#d8c098" />
      <rect x="29" y="12" width="4" height="1" fill="#ece0c0" />
      {/* raised fist + knuckle light */}
      <ellipse cx="31" cy="8.5" rx="5" ry="4" fill="#f4b43a" opacity="0.18" />
      <rect x="28" y="6" width="6" height="6" fill="#150d08" />
      <rect x="29" y="7" width="4" height="4" fill="#b8905c" />
      <rect x="29" y="7" width="4" height="1" fill="#d4ad78" />
      <rect x="29" y="7" width="2" height="1" fill="#ecd0a0" />
      <rect x="32" y="8" width="1" height="3" fill="#95714a" />
      {/* knuckle separations */}
      <rect x="30" y="8" width="1" height="1" fill="#95714a" />
      <rect x="31" y="8" width="1" height="1" fill="#a8845a" />
      {/* ki motes */}
      <rect x="27" y="5" width="1" height="1" fill="#ffc878" opacity="0.8" />
      <rect x="34" y="10" width="1" height="1" fill="#f4b43a" opacity="0.6" />

      {/* ── Left arm — coiled low at the hip ── */}
      <rect x="5" y="18" width="5" height="5" fill="#150d08" />
      <rect x="6" y="19" width="3" height="3" fill="#b8905c" />
      <rect x="6" y="19" width="1" height="3" fill="#d4ad78" />
      <rect x="4" y="22" width="5" height="5" fill="#150d08" />
      <rect x="5" y="23" width="3" height="3" fill="#a8845a" />
      <rect x="5" y="23" width="1" height="3" fill="#c29c6a" />
      {/* wrist wrap */}
      <rect x="4" y="26" width="5" height="2" fill="#150d08" />
      <rect x="5" y="26" width="3" height="1" fill="#d8c098" />
      {/* coiled fist */}
      <rect x="3" y="27" width="6" height="5" fill="#150d08" />
      <rect x="4" y="28" width="4" height="3" fill="#b8905c" />
      <rect x="4" y="28" width="4" height="1" fill="#d4ad78" />
      <rect x="4" y="28" width="1" height="1" fill="#ecd0a0" />
      <rect x="7" y="29" width="1" height="2" fill="#95714a" />

      {/* ── Rope belt — knot + trailing prayer beads ── */}
      <rect x="8" y="29" width="21" height="3" fill="#150d08" />
      <rect x="9" y="30" width="19" height="2" fill="#a84818" />
      <rect x="9" y="30" width="19" height="1" fill="#c25a1a" />
      <rect x="9" y="30" width="6" height="1" fill="#e07820" />
      {/* knot */}
      <rect x="17" y="29" width="3" height="3" fill="#150d08" />
      <rect x="18" y="30" width="2" height="2" fill="#6f2c0c" />
      <rect x="18" y="30" width="1" height="1" fill="#a84818" />
      {/* prayer beads trailing right */}
      <rect x="24" y="32" width="1" height="1" fill="#7a5a36" />
      <rect x="25" y="33" width="1" height="1" fill="#8c6a40" />
      <rect x="24" y="34" width="1" height="1" fill="#7a5a36" />
      <rect x="25" y="35" width="1" height="1" fill="#a8814a" />

      {/* ── Saffron wrap skirt — deep folds ── */}
      <rect x="8" y="32" width="21" height="11" fill="#150d08" />
      <rect x="9" y="33" width="19" height="9" fill="#c25a1a" />
      <rect x="9" y="33" width="2" height="9" fill="#e07820" />
      <rect x="9" y="33" width="1" height="5" fill="#f49a3a" />
      <rect x="24" y="33" width="3" height="9" fill="#a84818" />
      <rect x="26" y="33" width="2" height="9" fill="#7f3210" />
      {/* fold shadows + lit pleats */}
      <rect x="14" y="33" width="1" height="9" fill="#a84818" />
      <rect x="19" y="33" width="1" height="9" fill="#a84818" />
      <rect x="16" y="33" width="1" height="9" fill="#e07820" />
      <rect x="22" y="33" width="1" height="9" fill="#c25a1a" />
      {/* hem */}
      <rect x="9" y="41" width="19" height="1" fill="#6f2c0c" />

      {/* ── Legs — bare, wide stance; ankle wraps ── */}
      <rect x="9" y="42" width="7" height="12" fill="#150d08" />
      <rect x="10" y="43" width="5" height="10" fill="#b8905c" />
      <rect x="10" y="43" width="1" height="10" fill="#d4ad78" />
      <rect x="13" y="43" width="2" height="10" fill="#95714a" />
      <rect x="20" y="42" width="7" height="12" fill="#150d08" />
      <rect x="21" y="43" width="5" height="10" fill="#a8845a" />
      <rect x="21" y="43" width="1" height="10" fill="#c29c6a" />
      <rect x="24" y="43" width="2" height="10" fill="#7e6240" />
      {/* calf shading */}
      <rect x="10" y="47" width="5" height="1" fill="#95714a" />
      <rect x="21" y="47" width="5" height="1" fill="#7e6240" />
      {/* ankle wraps */}
      <rect x="10" y="50" width="5" height="2" fill="#d8c098" />
      <rect x="10" y="50" width="5" height="1" fill="#ece0c0" />
      <rect x="21" y="50" width="5" height="2" fill="#c8b088" />
      <rect x="21" y="50" width="5" height="1" fill="#d8c098" />

      {/* ── Bare feet — planted, toes split ── */}
      <rect x="8" y="52" width="9" height="6" fill="#150d08" />
      <rect x="9" y="53" width="7" height="4" fill="#b8905c" />
      <rect x="9" y="53" width="7" height="1" fill="#d4ad78" />
      <rect x="9" y="56" width="7" height="1" fill="#6f5236" />
      <rect x="10" y="55" width="1" height="1" fill="#95714a" />
      <rect x="12" y="55" width="1" height="1" fill="#95714a" />
      <rect x="14" y="55" width="1" height="1" fill="#95714a" />
      <rect x="19" y="52" width="9" height="6" fill="#150d08" />
      <rect x="20" y="53" width="7" height="4" fill="#a8845a" />
      <rect x="20" y="53" width="7" height="1" fill="#c29c6a" />
      <rect x="20" y="56" width="7" height="1" fill="#5c4226" />
      <rect x="22" y="55" width="1" height="1" fill="#8a6a44" />
      <rect x="24" y="55" width="1" height="1" fill="#8a6a44" />
    </svg>
  );
}

function DruidSvg({ className }: { className?: string }) {
  // 36×60. Antlered crown, leaf hood, moss beard with lichen, bark robe with
  // vine sash, gnarled staff crowned by a living sprig. Grove-green haze.
  return (
    <svg
      viewBox="0 0 36 60"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="Druid"
    >
      {/* Backlight — grove haze + amber key */}
      <ellipse cx="16" cy="26" rx="19" ry="27" fill="#5a8a3a" opacity="0.10" />
      <ellipse cx="23" cy="23" rx="15" ry="21" fill="#3a6a72" opacity="0.05" />
      <ellipse cx="16" cy="19" rx="12" ry="16" fill="#e8a020" opacity="0.06" />
      {/* Ground-contact shadow */}
      <ellipse cx="18" cy="58.4" rx="13" ry="2.1" fill="#000" opacity="0.45" />

      {/* ── Antlers — three-tine, lit upper edges ── */}
      {/* left antler */}
      <rect x="8" y="2" width="3" height="4" fill="#150d08" />
      <rect x="6" y="0" width="3" height="4" fill="#150d08" />
      <rect x="9" y="0" width="2" height="3" fill="#150d08" />
      <rect x="4" y="2" width="3" height="3" fill="#150d08" />
      <rect x="9" y="3" width="1" height="3" fill="#7a5a36" />
      <rect x="7" y="1" width="1" height="3" fill="#8c6a40" />
      <rect x="9" y="1" width="1" height="2" fill="#a8814a" />
      <rect x="5" y="3" width="1" height="1" fill="#b89058" />
      <rect x="7" y="1" width="1" height="1" fill="#b89058" />
      {/* right antler */}
      <rect x="25" y="2" width="3" height="4" fill="#150d08" />
      <rect x="27" y="0" width="3" height="4" fill="#150d08" />
      <rect x="25" y="0" width="2" height="3" fill="#150d08" />
      <rect x="29" y="2" width="3" height="3" fill="#150d08" />
      <rect x="26" y="3" width="1" height="3" fill="#5a3f24" />
      <rect x="28" y="1" width="1" height="3" fill="#7a5a36" />
      <rect x="26" y="1" width="1" height="2" fill="#8c6a40" />
      <rect x="30" y="3" width="1" height="1" fill="#a8814a" />

      {/* ── Leaf hood — jagged edge, green ramp ── */}
      {/* outline */}
      <rect x="13" y="3" width="11" height="2" fill="#150d08" />
      <rect x="11" y="5" width="15" height="10" fill="#150d08" />
      {/* hood body */}
      <rect x="14" y="4" width="9" height="1" fill="#223818" />
      <rect x="12" y="6" width="13" height="8" fill="#2e4327" />
      <rect x="12" y="5" width="11" height="1" fill="#2e4327" />
      <rect x="22" y="6" width="3" height="8" fill="#1c2c16" />
      <rect x="24" y="6" width="1" height="8" fill="#12200c" />
      {/* lit leaf-plates upper-left */}
      <rect x="12" y="5" width="4" height="1" fill="#4a6b3a" />
      <rect x="12" y="5" width="2" height="1" fill="#5a8a3a" />
      <rect x="12" y="6" width="2" height="2" fill="#3a5a2c" />
      <rect x="12" y="6" width="1" height="1" fill="#6a9a44" />
      {/* leaf jags over the brow */}
      <polygon points="13,7 14,9 15,7" fill="#223818" />
      <polygon points="16,7 17,9 18,7" fill="#2e4327" />
      <polygon points="19,7 20,9 21,7" fill="#223818" />
      <polygon points="22,7 23,9 24,7" fill="#1c2c16" />
      {/* face shadowed in the hood */}
      <rect x="13" y="8" width="10" height="6" fill="#a8845a" />
      <rect x="13" y="8" width="10" height="1" fill="#8a6a44" />
      <rect x="13" y="8" width="2" height="6" fill="#c29c6a" />
      <rect x="21" y="8" width="2" height="6" fill="#6f5236" />
      {/* calm green eyes + glint */}
      <rect x="14" y="10" width="3" height="2" fill="#1c2c16" />
      <rect x="20" y="10" width="3" height="2" fill="#1c2c16" />
      <rect x="15" y="10" width="2" height="1" fill="#8ac858" />
      <rect x="20" y="10" width="2" height="1" fill="#8ac858" />
      <rect x="15" y="10" width="1" height="1" fill="#d2ff9a" />
      {/* weathered brow lines */}
      <rect x="14" y="9" width="3" height="1" fill="#6f5236" />
      <rect x="20" y="9" width="3" height="1" fill="#6f5236" />
      <rect x="18" y="11" width="1" height="2" fill="#8a6a44" />

      {/* ── Moss beard — grey-green falls, lichen dots ── */}
      <rect x="12" y="13" width="13" height="4" fill="#150d08" />
      <rect x="13" y="17" width="11" height="3" fill="#150d08" />
      <rect x="14" y="20" width="8" height="3" fill="#150d08" />
      <rect x="13" y="14" width="11" height="3" fill="#7d8a6a" />
      <rect x="13" y="14" width="11" height="1" fill="#9caa84" />
      <rect x="13" y="14" width="4" height="1" fill="#b4c09a" />
      <rect x="14" y="17" width="9" height="3" fill="#6b785a" />
      <rect x="15" y="20" width="6" height="2" fill="#5a6a4a" />
      {/* strand shadows + lit wisps */}
      <rect x="16" y="15" width="1" height="6" fill="#5a6a4a" />
      <rect x="20" y="15" width="1" height="5" fill="#5a6a4a" />
      <rect x="13" y="14" width="1" height="5" fill="#b4c09a" />
      <rect x="18" y="16" width="1" height="4" fill="#8a9a74" />
      {/* lichen flecks */}
      <rect x="15" y="16" width="1" height="1" fill="#c0e860" opacity="0.8" />
      <rect x="19" y="19" width="1" height="1" fill="#c0e860" opacity="0.6" />
      <rect x="17" y="21" width="1" height="1" fill="#a8d050" opacity="0.7" />

      {/* ── Leaf mantle — scalloped shoulder layers ── */}
      <rect x="7" y="16" width="23" height="5" fill="#150d08" />
      <rect x="8" y="17" width="21" height="3" fill="#2e4a22" />
      <rect x="8" y="17" width="21" height="1" fill="#3a5a2c" />
      <rect x="8" y="17" width="4" height="1" fill="#4a6b3a" />
      <rect x="8" y="17" width="2" height="1" fill="#5a8a3a" />
      <rect x="25" y="17" width="4" height="3" fill="#1c3014" />
      {/* hanging leaf scallops */}
      <polygon points="8,20 10,23 12,20" fill="#2e4a22" />
      <polygon points="12,20 14,23 16,20" fill="#223818" />
      <polygon points="20,20 22,23 24,20" fill="#223818" />
      <polygon points="24,20 26,23 28,20" fill="#1c3014" />
      <polygon points="8,20 9,22 10,20" fill="#4a6b3a" />
      {/* dew glints on the mantle */}
      <rect x="10" y="18" width="1" height="1" fill="#a8f0dc" opacity="0.7" />
      <rect x="23" y="18" width="1" height="1" fill="#6ac4b0" opacity="0.5" />

      {/* ── Bark robe — earth-brown, vine sash, leaf rune ── */}
      <rect x="9" y="20" width="19" height="27" fill="#150d08" />
      <rect x="10" y="21" width="17" height="25" fill="#4a3a26" />
      <rect x="10" y="21" width="2" height="25" fill="#5e4a32" />
      <rect x="10" y="21" width="1" height="12" fill="#6f593c" />
      <rect x="24" y="21" width="3" height="25" fill="#33271a" />
      <rect x="26" y="21" width="1" height="25" fill="#241a10" />
      <rect x="17" y="21" width="2" height="25" fill="#403322" />
      {/* bark grain dither */}
      <rect x="13" y="26" width="1" height="2" fill="#33271a" />
      <rect x="21" y="29" width="1" height="2" fill="#33271a" />
      <rect x="12" y="34" width="1" height="2" fill="#5e4a32" />
      <rect x="22" y="38" width="1" height="2" fill="#33271a" />
      <rect x="15" y="42" width="1" height="1" fill="#5e4a32" />
      {/* vine sash — diagonal, sprouting */}
      <rect x="10" y="29" width="4" height="1" fill="#3a5a2c" />
      <rect x="13" y="30" width="4" height="1" fill="#4a6b3a" />
      <rect x="16" y="31" width="4" height="1" fill="#3a5a2c" />
      <rect x="19" y="32" width="4" height="1" fill="#4a6b3a" />
      <rect x="22" y="33" width="4" height="1" fill="#2e4a22" />
      <rect x="12" y="29" width="1" height="1" fill="#8ac858" />
      <rect x="18" y="31" width="1" height="1" fill="#8ac858" />
      <rect x="24" y="33" width="1" height="1" fill="#5a8a3a" />
      {/* stitched leaf rune on the chest */}
      <rect x="15" y="23" width="1" height="4" fill="#5a8a3a" />
      <rect x="14" y="24" width="3" height="2" fill="#3a5a2c" />
      <rect x="15" y="23" width="1" height="1" fill="#8ac858" />
      {/* hem — root tangle */}
      <rect x="10" y="44" width="17" height="2" fill="#241a10" />
      <rect x="10" y="44" width="17" height="1" fill="#33271a" />
      <polygon points="10,46 12,48 14,46" fill="#33271a" />
      <polygon points="16,46 18,48 20,46" fill="#241a10" />
      <polygon points="22,46 24,48 26,46" fill="#33271a" />

      {/* ── Left arm — cupping a sprouting seedling ── */}
      <rect x="9" y="22" width="5" height="4" fill="#150d08" />
      <rect x="10" y="23" width="3" height="2" fill="#4a3a26" />
      <rect x="10" y="23" width="1" height="2" fill="#5e4a32" />
      <rect x="6" y="25" width="6" height="5" fill="#150d08" />
      <rect x="7" y="26" width="4" height="3" fill="#4a3a26" />
      <rect x="7" y="26" width="1" height="3" fill="#5e4a32" />
      {/* cupped hand */}
      <rect x="5" y="29" width="6" height="4" fill="#150d08" />
      <rect x="6" y="30" width="4" height="2" fill="#a8845a" />
      <rect x="6" y="30" width="4" height="1" fill="#c29c6a" />
      {/* seedling — two leaves + glow */}
      <ellipse cx="8" cy="27.5" rx="4" ry="3.5" fill="#a8d050" opacity="0.20" />
      <rect x="7" y="27" width="1" height="3" fill="#5a8a3a" />
      <rect x="6" y="26" width="1" height="2" fill="#8ac858" />
      <rect x="8" y="25" width="2" height="2" fill="#8ac858" />
      <rect x="8" y="25" width="1" height="1" fill="#d2ff9a" />

      {/* ── Staff — gnarled, living sprig head ── */}
      {/* right sleeve + gripping hand */}
      <rect x="24" y="22" width="6" height="5" fill="#150d08" />
      <rect x="25" y="23" width="4" height="3" fill="#4a3a26" />
      <rect x="25" y="23" width="1" height="3" fill="#5e4a32" />
      <rect x="28" y="26" width="5" height="4" fill="#150d08" />
      <rect x="29" y="27" width="3" height="2" fill="#a8845a" />
      <rect x="29" y="27" width="3" height="1" fill="#c29c6a" />
      {/* gnarled shaft — knots offset */}
      <rect x="29" y="5" width="4" height="49" fill="#150d08" />
      <rect x="30" y="6" width="2" height="47" fill="#5a3f24" />
      <rect x="30" y="6" width="1" height="47" fill="#7a5a36" />
      <rect x="29" y="16" width="1" height="2" fill="#5a3f24" />
      <rect x="32" y="24" width="1" height="2" fill="#3a2418" />
      <rect x="30" y="33" width="2" height="1" fill="#2a1810" />
      <rect x="30" y="43" width="2" height="1" fill="#2a1810" />
      {/* living sprig — glow + leaves + berries */}
      <ellipse cx="31" cy="3" rx="7" ry="5" fill="#7aa84a" opacity="0.22" />
      <ellipse cx="31" cy="3" rx="4" ry="3" fill="#a8d050" opacity="0.24" />
      <rect x="28" y="1" width="6" height="5" fill="#150d08" />
      <rect x="29" y="2" width="4" height="3" fill="#5a8a3a" />
      <rect x="29" y="2" width="2" height="2" fill="#8ac858" />
      <rect x="29" y="2" width="1" height="1" fill="#d2ff9a" />
      <rect x="33" y="3" width="1" height="2" fill="#3a5a2c" />
      <polygon points="28,2 26,0 29,1" fill="#5a8a3a" />
      <polygon points="33,1 35,0 34,3" fill="#3a5a2c" />
      {/* berry */}
      <rect x="32" y="4" width="1" height="1" fill="#c23030" />
      {/* drifting motes */}
      <rect x="26" y="6" width="1" height="1" fill="#a8d050" opacity="0.8" />
      <rect x="34" y="9" width="1" height="1" fill="#8ac858" opacity="0.6" />
      <rect x="27" y="14" width="1" height="1" fill="#5a8a3a" opacity="0.6" />

      {/* ── Bare feet — earth-stained ── */}
      <rect x="10" y="52" width="8" height="6" fill="#150d08" />
      <rect x="11" y="53" width="6" height="4" fill="#95714a" />
      <rect x="11" y="53" width="6" height="1" fill="#b08a5e" />
      <rect x="11" y="56" width="6" height="1" fill="#5c4226" />
      <rect x="11" y="54" width="1" height="1" fill="#c29c6a" />
      {/* toe cuts */}
      <rect x="12" y="55" width="1" height="1" fill="#6f5236" />
      <rect x="14" y="55" width="1" height="1" fill="#6f5236" />
      <rect x="19" y="52" width="8" height="6" fill="#150d08" />
      <rect x="20" y="53" width="6" height="4" fill="#8a6a44" />
      <rect x="20" y="53" width="6" height="1" fill="#a8845a" />
      <rect x="20" y="56" width="6" height="1" fill="#503a20" />
      <rect x="22" y="55" width="1" height="1" fill="#6f5236" />
      <rect x="24" y="55" width="1" height="1" fill="#6f5236" />
    </svg>
  );
}

function FighterSvg({ className }: { className?: string }) {
  // 36×60 grid (HD 8-bit bible). Key light = warm amber, upper-left; cool
  // teal-steel shadow side; 1px warm near-black outline (#150d08) drawn as
  // under-layer silhouettes per part.
  return (
    <svg
      viewBox="0 0 36 60"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="Fighter"
    >
      {/* Backlight — warm torch key crossed with a cool steel rim */}
      <ellipse cx="16" cy="26" rx="19" ry="27" fill="#e8a020" opacity="0.10" />
      <ellipse cx="23" cy="23" rx="15" ry="23" fill="#4a6a90" opacity="0.07" />
      <ellipse cx="16" cy="19" rx="12" ry="16" fill="#ffb040" opacity="0.06" />
      {/* Ground-contact shadow */}
      <ellipse cx="18" cy="58.4" rx="13" ry="2.1" fill="#000" opacity="0.45" />

      {/* ── Plume — crimson crest sweeping back-left, hot lit tip ── */}
      <rect x="6" y="4" width="3" height="3" fill="#150d08" />
      <rect x="7" y="2" width="4" height="4" fill="#150d08" />
      <rect x="9" y="1" width="5" height="4" fill="#150d08" />
      <rect x="12" y="0" width="6" height="4" fill="#150d08" />
      <rect x="16" y="0" width="4" height="5" fill="#150d08" />
      <rect x="7" y="4" width="2" height="2" fill="#531320" />
      <rect x="8" y="3" width="3" height="2" fill="#7e1f2c" />
      <rect x="10" y="2" width="3" height="2" fill="#7e1f2c" />
      <rect x="12" y="1" width="3" height="3" fill="#a93340" />
      <rect x="14" y="1" width="3" height="2" fill="#a93340" />
      <rect x="15" y="2" width="3" height="2" fill="#7e1f2c" />
      <rect x="16" y="1" width="3" height="3" fill="#a93340" />
      <rect x="13" y="1" width="2" height="1" fill="#d05452" />
      <rect x="16" y="1" width="2" height="1" fill="#d05452" />
      <rect x="17" y="1" width="1" height="1" fill="#f08a6a" />
      <rect x="9" y="3" width="1" height="1" fill="#a93340" />
      <rect x="11" y="2" width="1" height="1" fill="#d05452" />
      {/* feather notches */}
      <rect x="10" y="4" width="1" height="1" fill="#531320" />
      <rect x="13" y="3" width="1" height="1" fill="#531320" />
      <rect x="16" y="3" width="1" height="1" fill="#531320" />

      {/* ── Helmet — closed barbute, steel ramp, crest mount ── */}
      {/* outline */}
      <rect x="13" y="3" width="11" height="2" fill="#150d08" />
      <rect x="12" y="4" width="13" height="1" fill="#150d08" />
      <rect x="11" y="5" width="15" height="9" fill="#150d08" />
      <rect x="12" y="14" width="13" height="2" fill="#150d08" />
      {/* crest mount */}
      <rect x="17" y="3" width="3" height="1" fill="#9a7232" />
      <rect x="17" y="3" width="1" height="1" fill="#c89a48" />
      {/* crown fill */}
      <rect x="14" y="4" width="9" height="1" fill="#4e586a" />
      <rect x="13" y="5" width="11" height="1" fill="#4e586a" />
      <rect x="12" y="6" width="13" height="7" fill="#4e586a" />
      <rect x="13" y="13" width="11" height="1" fill="#39424f" />
      <rect x="13" y="14" width="11" height="1" fill="#232c3a" />
      {/* lit left dome + hot rim */}
      <rect x="14" y="4" width="4" height="1" fill="#6d7689" />
      <rect x="13" y="5" width="3" height="1" fill="#939cb0" />
      <rect x="12" y="6" width="2" height="6" fill="#6d7689" />
      <rect x="12" y="6" width="1" height="4" fill="#939cb0" />
      <rect x="14" y="4" width="2" height="1" fill="#c8cfe0" />
      <rect x="12" y="6" width="1" height="1" fill="#f2f0e4" />
      {/* cool shadow right */}
      <rect x="22" y="5" width="2" height="8" fill="#39424f" />
      <rect x="24" y="6" width="1" height="7" fill="#232c3a" />
      <rect x="23" y="4" width="1" height="1" fill="#39424f" />
      {/* teal bounce on the dark cheek */}
      <rect x="24" y="9" width="1" height="3" fill="#2e4a4e" />
      {/* brow ridge */}
      <rect x="12" y="6" width="13" height="1" fill="#39424f" opacity="0.6" />
      {/* visor slit + amber eye-fire */}
      <ellipse cx="18" cy="8.5" rx="5" ry="2" fill="#f4b43a" opacity="0.16" />
      <rect x="13" y="7" width="11" height="3" fill="#0c0805" />
      <rect x="13" y="7" width="11" height="1" fill="#161b24" />
      <rect x="15" y="8" width="2" height="1" fill="#ffb648" />
      <rect x="20" y="8" width="2" height="1" fill="#ffb648" />
      <rect x="15" y="8" width="1" height="1" fill="#ffe9b0" />
      <rect x="20" y="8" width="1" height="1" fill="#ffe9b0" />
      {/* cheek plates + breath holes */}
      <rect x="13" y="10" width="10" height="1" fill="#6d7689" opacity="0.5" />
      <rect x="16" y="11" width="1" height="1" fill="#161b24" />
      <rect x="18" y="11" width="1" height="1" fill="#161b24" />
      <rect x="20" y="11" width="1" height="1" fill="#161b24" />
      <rect x="14" y="12" width="2" height="1" fill="#6d7689" />
      {/* chin seam */}
      <rect x="14" y="13" width="9" height="1" fill="#161b24" opacity="0.7" />

      {/* ── Gorget / neck ── */}
      <rect x="14" y="15" width="9" height="2" fill="#150d08" />
      <rect x="15" y="15" width="7" height="1" fill="#232c3a" />
      <rect x="15" y="16" width="7" height="1" fill="#39424f" />
      <rect x="15" y="15" width="2" height="1" fill="#4e586a" />

      {/* ── Pauldrons — big layered domes; lit left, shadow right ── */}
      {/* left pauldron outline + fill */}
      <rect x="5" y="16" width="10" height="6" fill="#150d08" />
      <rect x="6" y="17" width="8" height="2" fill="#6d7689" />
      <rect x="6" y="19" width="8" height="2" fill="#4e586a" />
      <rect x="6" y="17" width="4" height="1" fill="#939cb0" />
      <rect x="6" y="17" width="2" height="1" fill="#c8cfe0" />
      <rect x="6" y="17" width="1" height="1" fill="#f2f0e4" />
      <rect x="6" y="20" width="8" height="1" fill="#39424f" />
      {/* gold trim edge */}
      <rect x="6" y="21" width="8" height="1" fill="#9a7232" />
      <rect x="6" y="21" width="3" height="1" fill="#c89a48" />
      {/* right pauldron outline + fill (shadow side) */}
      <rect x="22" y="16" width="10" height="6" fill="#150d08" />
      <rect x="23" y="17" width="8" height="2" fill="#4e586a" />
      <rect x="23" y="19" width="8" height="2" fill="#39424f" />
      <rect x="23" y="17" width="2" height="1" fill="#6d7689" />
      <rect x="29" y="17" width="2" height="4" fill="#232c3a" />
      <rect x="23" y="20" width="8" height="1" fill="#232c3a" />
      <rect x="23" y="21" width="8" height="1" fill="#6b4a22" />
      <rect x="30" y="17" width="1" height="3" fill="#2e4a4e" opacity="0.8" />

      {/* ── Cuirass — steel dome, center ridge, plackart ── */}
      {/* outline */}
      <rect x="11" y="17" width="15" height="16" fill="#150d08" />
      {/* base */}
      <rect x="12" y="18" width="13" height="14" fill="#4e586a" />
      {/* lit left column + hot edge */}
      <rect x="12" y="18" width="3" height="13" fill="#6d7689" />
      <rect x="12" y="18" width="1" height="13" fill="#939cb0" />
      <rect x="12" y="18" width="1" height="3" fill="#e8d9ae" />
      {/* shadow right column */}
      <rect x="23" y="18" width="2" height="13" fill="#39424f" />
      <rect x="24" y="18" width="1" height="13" fill="#232c3a" />
      {/* center ridge */}
      <rect x="18" y="18" width="1" height="13" fill="#6d7689" />
      <rect x="19" y="18" width="1" height="13" fill="#39424f" />
      {/* pec domes */}
      <rect x="14" y="20" width="3" height="1" fill="#939cb0" />
      <rect x="15" y="21" width="1" height="1" fill="#c8cfe0" />
      <rect x="20" y="20" width="3" height="1" fill="#4e586a" />
      <rect x="21" y="21" width="1" height="1" fill="#6d7689" />
      {/* plackart seam + lower plate */}
      <rect x="13" y="26" width="11" height="1" fill="#232c3a" />
      <rect x="13" y="27" width="11" height="1" fill="#6d7689" opacity="0.6" />
      {/* dither at tone boundary */}
      <rect x="21" y="19" width="1" height="1" fill="#39424f" />
      <rect x="22" y="22" width="1" height="1" fill="#232c3a" />
      <rect x="14" y="24" width="1" height="1" fill="#939cb0" />
      <rect x="21" y="25" width="1" height="1" fill="#39424f" />
      {/* glowing gold emblem — crowned cross, bloom + core */}
      <ellipse cx="18.5" cy="23" rx="5" ry="4.5" fill="#f4d042" opacity="0.16" />
      <rect x="17" y="20" width="3" height="1" fill="#9a7232" />
      <rect x="18" y="21" width="1" height="4" fill="#c89a48" />
      <rect x="16" y="22" width="5" height="1" fill="#c89a48" />
      <rect x="18" y="21" width="1" height="2" fill="#ecc46a" />
      <rect x="18" y="22" width="1" height="1" fill="#fff0b8" />
      <rect x="16" y="22" width="1" height="1" fill="#ecc46a" />
      {/* gold collar trim */}
      <rect x="15" y="18" width="7" height="1" fill="#9a7232" />
      <rect x="15" y="18" width="3" height="1" fill="#c89a48" />

      {/* ── Belt — leather + gold buckle ── */}
      <rect x="11" y="31" width="15" height="3" fill="#150d08" />
      <rect x="12" y="32" width="13" height="2" fill="#33231a" />
      <rect x="12" y="32" width="13" height="1" fill="#4f3722" />
      <rect x="12" y="32" width="4" height="1" fill="#6e4e30" />
      <rect x="17" y="32" width="3" height="2" fill="#9a7232" />
      <rect x="17" y="32" width="3" height="1" fill="#c89a48" />
      <rect x="18" y="32" width="1" height="1" fill="#fff0b8" />

      {/* ── Faulds / tassets + crimson cloth drop ── */}
      <rect x="11" y="34" width="15" height="6" fill="#150d08" />
      <rect x="12" y="34" width="13" height="2" fill="#4e586a" />
      <rect x="12" y="34" width="13" height="1" fill="#6d7689" />
      <rect x="12" y="36" width="13" height="1" fill="#39424f" />
      <rect x="12" y="37" width="13" height="2" fill="#4e586a" />
      <rect x="12" y="37" width="13" height="1" fill="#6d7689" opacity="0.5" />
      <rect x="12" y="34" width="2" height="5" fill="#6d7689" />
      <rect x="12" y="34" width="1" height="5" fill="#939cb0" />
      <rect x="23" y="34" width="2" height="5" fill="#39424f" />
      <rect x="24" y="34" width="1" height="5" fill="#232c3a" />
      <rect x="13" y="39" width="11" height="1" fill="#232c3a" />
      {/* crimson cloth drop between the legs */}
      <rect x="15" y="34" width="7" height="9" fill="#150d08" />
      <rect x="16" y="34" width="5" height="8" fill="#7e1f2c" />
      <rect x="16" y="34" width="2" height="8" fill="#a93340" />
      <rect x="16" y="34" width="1" height="5" fill="#d05452" />
      <rect x="20" y="34" width="1" height="8" fill="#531320" />
      <rect x="17" y="38" width="1" height="1" fill="#7e1f2c" />
      <rect x="16" y="41" width="5" height="1" fill="#531320" />
      {/* gold hem on the cloth */}
      <rect x="16" y="42" width="5" height="1" fill="#9a7232" />
      <rect x="16" y="42" width="2" height="1" fill="#c89a48" />

      {/* ── Right arm (viewer right) — raised, holding the longsword ── */}
      {/* upper arm from pauldron */}
      <rect x="25" y="20" width="6" height="4" fill="#150d08" />
      <rect x="26" y="21" width="4" height="2" fill="#39424f" />
      <rect x="26" y="21" width="1" height="2" fill="#4e586a" />
      {/* vambrace angling up */}
      <rect x="27" y="16" width="6" height="6" fill="#150d08" />
      <rect x="28" y="17" width="4" height="4" fill="#4e586a" />
      <rect x="28" y="17" width="1" height="4" fill="#6d7689" />
      <rect x="31" y="17" width="1" height="4" fill="#232c3a" />
      {/* gauntlet fist gripping */}
      <rect x="27" y="12" width="6" height="5" fill="#150d08" />
      <rect x="28" y="13" width="4" height="3" fill="#6d7689" />
      <rect x="28" y="13" width="4" height="1" fill="#939cb0" />
      <rect x="28" y="13" width="1" height="1" fill="#c8cfe0" />
      <rect x="31" y="14" width="1" height="2" fill="#39424f" />
      <rect x="29" y="15" width="2" height="1" fill="#39424f" />

      {/* ── Longsword — raised; bright spine, warm spec, gold guard ── */}
      {/* blade outline */}
      <rect x="28" y="0" width="4" height="12" fill="#150d08" />
      <rect x="29" y="0" width="3" height="1" fill="#150d08" />
      {/* blade — tapers at tip */}
      <rect x="29" y="1" width="1" height="10" fill="#e8eef8" />
      <rect x="30" y="1" width="1" height="10" fill="#939cb0" />
      <rect x="31" y="2" width="1" height="9" fill="#54596a" />
      <rect x="29" y="0" width="1" height="1" fill="#ffffff" />
      <rect x="29" y="3" width="1" height="2" fill="#ffffff" />
      <rect x="30" y="6" width="1" height="1" fill="#c8cfe0" />
      {/* crossguard — gold */}
      <rect x="26" y="11" width="8" height="2" fill="#150d08" />
      <rect x="27" y="11" width="6" height="1" fill="#c89a48" />
      <rect x="27" y="11" width="2" height="1" fill="#ecc46a" />
      <rect x="27" y="11" width="1" height="1" fill="#fff0b8" />
      <rect x="33" y="11" width="1" height="1" fill="#6b4a22" />
      {/* grip below fist + pommel */}
      <rect x="29" y="16" width="2" height="3" fill="#150d08" />
      <rect x="29" y="16" width="1" height="2" fill="#4f3722" />
      <rect x="30" y="16" width="1" height="2" fill="#33231a" />
      <rect x="29" y="18" width="2" height="1" fill="#9a7232" />
      <rect x="29" y="18" width="1" height="1" fill="#ecc46a" />

      {/* ── Left arm + heater shield ── */}
      {/* shield outline (tapered heater) */}
      <rect x="1" y="20" width="11" height="13" fill="#150d08" />
      <rect x="2" y="33" width="9" height="2" fill="#150d08" />
      <rect x="3" y="35" width="7" height="2" fill="#150d08" />
      <rect x="4" y="37" width="5" height="2" fill="#150d08" />
      <rect x="5" y="39" width="3" height="1" fill="#150d08" />
      {/* gold rim */}
      <rect x="2" y="21" width="9" height="1" fill="#c89a48" />
      <rect x="2" y="21" width="3" height="1" fill="#ecc46a" />
      <rect x="2" y="21" width="1" height="1" fill="#fff0b8" />
      <rect x="2" y="21" width="1" height="11" fill="#9a7232" />
      <rect x="10" y="21" width="1" height="11" fill="#6b4a22" />
      {/* steel field */}
      <rect x="3" y="22" width="7" height="10" fill="#4e586a" />
      <rect x="3" y="22" width="2" height="10" fill="#6d7689" />
      <rect x="3" y="22" width="1" height="6" fill="#939cb0" />
      <rect x="8" y="22" width="2" height="10" fill="#39424f" />
      <rect x="9" y="22" width="1" height="10" fill="#232c3a" />
      {/* taper rows */}
      <rect x="3" y="32" width="7" height="1" fill="#39424f" />
      <rect x="3" y="32" width="2" height="1" fill="#6d7689" />
      <rect x="4" y="33" width="5" height="2" fill="#39424f" />
      <rect x="4" y="33" width="1" height="2" fill="#6d7689" />
      <rect x="8" y="33" width="1" height="2" fill="#232c3a" />
      <rect x="5" y="35" width="3" height="2" fill="#232c3a" />
      <rect x="5" y="35" width="1" height="1" fill="#39424f" />
      <rect x="6" y="37" width="1" height="2" fill="#161b24" />
      {/* crimson chevron on the field */}
      <rect x="3" y="25" width="2" height="1" fill="#a93340" />
      <rect x="5" y="26" width="1" height="1" fill="#a93340" />
      <rect x="6" y="27" width="1" height="1" fill="#7e1f2c" />
      <rect x="7" y="26" width="1" height="1" fill="#7e1f2c" />
      <rect x="8" y="25" width="2" height="1" fill="#7e1f2c" />
      <rect x="3" y="25" width="1" height="1" fill="#d05452" />
      {/* domed boss + spec */}
      <rect x="5" y="28" width="3" height="3" fill="#6d7689" />
      <rect x="5" y="28" width="2" height="2" fill="#939cb0" />
      <rect x="5" y="28" width="1" height="1" fill="#f2f0e4" />
      <rect x="7" y="30" width="1" height="1" fill="#39424f" />
      {/* gold rivets */}
      <rect x="3" y="23" width="1" height="1" fill="#ecc46a" />
      <rect x="9" y="23" width="1" height="1" fill="#9a7232" />
      <rect x="3" y="31" width="1" height="1" fill="#ecc46a" />
      <rect x="9" y="31" width="1" height="1" fill="#9a7232" />
      {/* left arm hint above shield */}
      <rect x="8" y="18" width="4" height="3" fill="#150d08" />
      <rect x="9" y="19" width="2" height="1" fill="#39424f" />

      {/* ── Legs — cuisse, gold knee cop, greave with shin light ── */}
      {/* left leg */}
      <rect x="11" y="40" width="6" height="14" fill="#150d08" />
      <rect x="12" y="40" width="4" height="3" fill="#4e586a" />
      <rect x="12" y="40" width="1" height="3" fill="#6d7689" />
      <rect x="15" y="40" width="1" height="3" fill="#39424f" />
      <rect x="12" y="43" width="4" height="2" fill="#9a7232" />
      <rect x="12" y="43" width="2" height="1" fill="#c89a48" />
      <rect x="12" y="43" width="1" height="1" fill="#ecc46a" />
      <rect x="12" y="45" width="4" height="8" fill="#4e586a" />
      <rect x="12" y="45" width="1" height="8" fill="#939cb0" />
      <rect x="13" y="45" width="1" height="8" fill="#6d7689" />
      <rect x="15" y="45" width="1" height="8" fill="#232c3a" />
      <rect x="12" y="45" width="1" height="2" fill="#c8cfe0" />
      {/* right leg (shadow side) */}
      <rect x="20" y="40" width="6" height="14" fill="#150d08" />
      <rect x="21" y="40" width="4" height="3" fill="#39424f" />
      <rect x="21" y="40" width="1" height="3" fill="#4e586a" />
      <rect x="24" y="40" width="1" height="3" fill="#232c3a" />
      <rect x="21" y="43" width="4" height="2" fill="#6b4a22" />
      <rect x="21" y="43" width="2" height="1" fill="#9a7232" />
      <rect x="21" y="45" width="4" height="8" fill="#39424f" />
      <rect x="21" y="45" width="1" height="8" fill="#6d7689" />
      <rect x="24" y="45" width="1" height="8" fill="#161b24" />
      <rect x="24" y="47" width="1" height="3" fill="#2e4a4e" opacity="0.7" />

      {/* ── Sabatons — pointed steel, toe-cap glint ── */}
      <rect x="9" y="53" width="9" height="5" fill="#150d08" />
      <rect x="10" y="54" width="7" height="3" fill="#232c3a" />
      <rect x="10" y="54" width="7" height="1" fill="#39424f" />
      <rect x="10" y="54" width="3" height="1" fill="#4e586a" />
      <rect x="10" y="56" width="7" height="1" fill="#161b24" />
      <rect x="10" y="55" width="2" height="1" fill="#939cb0" />
      <rect x="10" y="55" width="1" height="1" fill="#c8cfe0" />
      <rect x="19" y="53" width="9" height="5" fill="#150d08" />
      <rect x="20" y="54" width="7" height="3" fill="#232c3a" />
      <rect x="20" y="54" width="7" height="1" fill="#39424f" />
      <rect x="20" y="56" width="7" height="1" fill="#161b24" />
      <rect x="25" y="55" width="2" height="1" fill="#54596a" />
    </svg>
  );
}

function RogueSvg({ className }: { className?: string }) {
  // 36×60. Hooded assassin in a knife-fighter crouch: face a void with ember
  // eyes, scarf, twin daggers (reverse grip up-left, low guard right), cape
  // kicked out; cold teal backlight so the black silhouette separates.
  return (
    <svg
      viewBox="0 0 36 60"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="Rogue"
    >
      {/* Backlight — cold teal rim from behind-left */}
      <ellipse cx="16" cy="25" rx="18" ry="26" fill="#1c3a3a" opacity="0.26" />
      <ellipse cx="13" cy="21" rx="13" ry="21" fill="#2e5a52" opacity="0.18" />
      <ellipse cx="18" cy="21" rx="12" ry="17" fill="#3a6a60" opacity="0.09" />
      {/* Ground-contact shadow */}
      <ellipse cx="18" cy="58.4" rx="13" ry="2.1" fill="#000" opacity="0.45" />

      {/* ── Hood — peaked, near-black ramp, teal rim catch-light ── */}
      {/* outline */}
      <rect x="14" y="4" width="9" height="2" fill="#150d08" />
      <rect x="12" y="6" width="13" height="2" fill="#150d08" />
      <rect x="11" y="8" width="15" height="10" fill="#150d08" />
      <rect x="12" y="18" width="13" height="1" fill="#150d08" />
      {/* hood body */}
      <rect x="15" y="5" width="7" height="1" fill="#221d18" />
      <rect x="13" y="7" width="11" height="1" fill="#2a2420" />
      <rect x="12" y="8" width="13" height="9" fill="#2a2420" />
      {/* shadow side */}
      <rect x="22" y="8" width="3" height="9" fill="#1a1512" />
      <rect x="24" y="8" width="1" height="9" fill="#100d0a" />
      {/* lit folds left */}
      <rect x="12" y="8" width="2" height="8" fill="#3a332c" />
      <rect x="13" y="9" width="2" height="2" fill="#463e34" />
      {/* teal rim catch-light upper-left */}
      <rect x="14" y="5" width="3" height="1" fill="#3a564e" />
      <rect x="13" y="6" width="2" height="1" fill="#4a7268" />
      <rect x="12" y="7" width="1" height="3" fill="#4a7268" />
      <rect x="14" y="5" width="1" height="1" fill="#8ac4b4" />
      <rect x="12" y="7" width="1" height="1" fill="#6aa090" />
      {/* hood point flips at the top */}
      <rect x="20" y="4" width="3" height="1" fill="#221d18" />
      <rect x="22" y="5" width="2" height="2" fill="#1a1512" />
      {/* face void */}
      <rect x="13" y="10" width="9" height="6" fill="#080604" />
      <rect x="13" y="10" width="9" height="1" fill="#0e0b08" />
      {/* ember eyes — amber slits, red-hot cores, faint bloom */}
      <ellipse cx="17.5" cy="12.5" rx="5" ry="2" fill="#f4d042" opacity="0.13" />
      <rect x="14" y="12" width="3" height="1" fill="#f4b43a" />
      <rect x="19" y="12" width="3" height="1" fill="#f4b43a" />
      <rect x="15" y="12" width="1" height="1" fill="#ff5838" />
      <rect x="20" y="12" width="1" height="1" fill="#ff5838" />
      <rect x="14" y="12" width="1" height="1" fill="#ffe9b0" />
      {/* mouth scarf wrapped over the jaw */}
      <rect x="13" y="15" width="9" height="2" fill="#33231a" />
      <rect x="13" y="15" width="9" height="1" fill="#4f3722" />
      <rect x="13" y="15" width="3" height="1" fill="#6e4e30" />
      {/* scarf tail flying left */}
      <rect x="8" y="15" width="5" height="2" fill="#150d08" />
      <rect x="9" y="15" width="4" height="1" fill="#4f3722" />
      <rect x="9" y="16" width="3" height="1" fill="#33231a" />
      <rect x="9" y="15" width="1" height="1" fill="#6e4e30" />

      {/* ── Shoulders + cape, kicked out left ── */}
      {/* outline */}
      <rect x="7" y="18" width="23" height="4" fill="#150d08" />
      <rect x="6" y="20" width="6" height="14" fill="#150d08" />
      {/* shoulder line */}
      <rect x="8" y="19" width="21" height="2" fill="#2a2420" />
      <rect x="8" y="19" width="21" height="1" fill="#3a332c" />
      <rect x="8" y="19" width="4" height="1" fill="#46553e" />
      <rect x="8" y="19" width="2" height="1" fill="#5a7a52" />
      <rect x="26" y="19" width="3" height="2" fill="#1a1512" />
      {/* cape falling left, teal-lit edge */}
      <rect x="7" y="21" width="4" height="12" fill="#221d18" />
      <rect x="7" y="21" width="2" height="12" fill="#2a2420" />
      <rect x="7" y="21" width="1" height="10" fill="#3a564e" />
      <rect x="7" y="21" width="1" height="3" fill="#4a7268" />
      <rect x="10" y="21" width="1" height="11" fill="#100d0a" />
      {/* ragged cape hem */}
      <rect x="7" y="33" width="2" height="2" fill="#150d08" />
      <rect x="9" y="32" width="2" height="1" fill="#150d08" />
      <rect x="7" y="33" width="1" height="1" fill="#221d18" />

      {/* ── Torso — lean crouch, leather harness ── */}
      {/* outline */}
      <rect x="11" y="20" width="15" height="13" fill="#150d08" />
      {/* body */}
      <rect x="12" y="21" width="13" height="11" fill="#352c22" />
      <rect x="12" y="21" width="2" height="11" fill="#4a3c2c" />
      <rect x="12" y="21" width="1" height="6" fill="#5e4a36" />
      <rect x="23" y="21" width="2" height="11" fill="#241e16" />
      <rect x="24" y="21" width="1" height="11" fill="#16110c" />
      {/* chest straps crossing + buckle */}
      <rect x="12" y="23" width="13" height="1" fill="#1c130b" />
      <rect x="12" y="26" width="13" height="1" fill="#1c130b" />
      <rect x="13" y="23" width="2" height="1" fill="#4f3722" />
      <rect x="18" y="23" width="1" height="1" fill="#8f6a40" />
      <rect x="18" y="23" width="1" height="1" fill="#c9a05a" opacity="0.8" />
      {/* dither texture */}
      <rect x="15" y="25" width="1" height="1" fill="#4a3c2c" />
      <rect x="21" y="24" width="1" height="1" fill="#241e16" />
      <rect x="14" y="28" width="1" height="1" fill="#4a3c2c" />
      <rect x="20" y="29" width="1" height="1" fill="#241e16" />

      {/* ── Belt — pouches, vials ── */}
      <rect x="11" y="31" width="15" height="3" fill="#150d08" />
      <rect x="12" y="32" width="13" height="2" fill="#1c130b" />
      <rect x="12" y="32" width="13" height="1" fill="#33231a" />
      {/* pouches */}
      <rect x="13" y="33" width="3" height="3" fill="#150d08" />
      <rect x="13" y="33" width="3" height="2" fill="#4f3722" />
      <rect x="13" y="33" width="3" height="1" fill="#6e4e30" />
      <rect x="20" y="33" width="3" height="3" fill="#150d08" />
      <rect x="20" y="33" width="3" height="2" fill="#4f3722" />
      <rect x="20" y="33" width="1" height="1" fill="#6e4e30" />
      {/* poison vial glint */}
      <rect x="17" y="33" width="2" height="3" fill="#150d08" />
      <rect x="17" y="33" width="1" height="2" fill="#3f7a46" />
      <rect x="18" y="33" width="1" height="2" fill="#2a5230" />
      <rect x="17" y="33" width="1" height="1" fill="#8ee49a" />

      {/* ── Right arm — low guard dagger, held down-out ── */}
      <rect x="24" y="21" width="6" height="4" fill="#150d08" />
      <rect x="25" y="22" width="4" height="2" fill="#352c22" />
      <rect x="25" y="22" width="4" height="1" fill="#4a3c2c" />
      <rect x="26" y="24" width="6" height="5" fill="#150d08" />
      <rect x="27" y="25" width="4" height="3" fill="#2a2420" />
      <rect x="27" y="25" width="1" height="3" fill="#3a332c" />
      {/* bare hand */}
      <rect x="28" y="28" width="5" height="4" fill="#150d08" />
      <rect x="29" y="29" width="3" height="2" fill="#b8905c" />
      <rect x="29" y="29" width="3" height="1" fill="#d4ad78" />
      <rect x="31" y="30" width="1" height="1" fill="#95714a" />
      {/* low dagger — hilt in the fist, blade straight down; teal underglow */}
      <rect x="28" y="31" width="5" height="2" fill="#150d08" />
      <rect x="29" y="31" width="3" height="1" fill="#4f3722" />
      <rect x="29" y="31" width="1" height="1" fill="#6e4e30" />
      <rect x="29" y="32" width="3" height="9" fill="#150d08" />
      <rect x="30" y="32" width="1" height="8" fill="#e8eef8" />
      <rect x="31" y="33" width="1" height="7" fill="#6d7689" />
      <rect x="30" y="33" width="1" height="2" fill="#ffffff" />
      <rect x="30" y="39" width="1" height="1" fill="#8ac4b4" />
      <rect x="31" y="36" width="1" height="2" fill="#3a6a60" opacity="0.6" />

      {/* ── Left arm — reverse-grip dagger raised across ── */}
      <rect x="9" y="21" width="5" height="4" fill="#150d08" />
      <rect x="10" y="22" width="3" height="2" fill="#352c22" />
      <rect x="8" y="23" width="5" height="4" fill="#150d08" />
      <rect x="9" y="24" width="3" height="2" fill="#2a2420" />
      <rect x="9" y="24" width="1" height="2" fill="#3a332c" />
      {/* bare hand, knuckles up */}
      <rect x="6" y="25" width="5" height="4" fill="#150d08" />
      <rect x="7" y="26" width="3" height="2" fill="#b8905c" />
      <rect x="7" y="26" width="3" height="1" fill="#d4ad78" />
      <rect x="7" y="26" width="1" height="1" fill="#ecd0a0" />
      {/* reverse-grip dagger — blade up-left past the shoulder */}
      <rect x="5" y="26" width="3" height="2" fill="#150d08" />
      <rect x="5" y="26" width="2" height="1" fill="#4f3722" />
      <rect x="3" y="17" width="3" height="9" fill="#150d08" />
      <rect x="4" y="17" width="1" height="8" fill="#e8eef8" />
      <rect x="5" y="18" width="1" height="7" fill="#6d7689" />
      <rect x="4" y="16" width="1" height="1" fill="#150d08" />
      <rect x="4" y="18" width="1" height="2" fill="#ffffff" />
      <rect x="5" y="22" width="1" height="2" fill="#3a6a60" opacity="0.6" />
      <rect x="4" y="17" width="1" height="1" fill="#8ac4b4" />

      {/* ── Legs — stride: left forward (lit), right trailing back ── */}
      {/* hip wrap */}
      <rect x="11" y="34" width="15" height="4" fill="#150d08" />
      <rect x="12" y="35" width="13" height="3" fill="#2a2420" />
      <rect x="12" y="35" width="13" height="1" fill="#3a332c" />
      <rect x="12" y="35" width="3" height="1" fill="#46553e" opacity="0.7" />
      {/* left (forward) leg — straight drop, lit edge */}
      <rect x="10" y="38" width="7" height="16" fill="#150d08" />
      <rect x="11" y="39" width="5" height="14" fill="#2a2420" />
      <rect x="11" y="39" width="2" height="14" fill="#3a332c" />
      <rect x="11" y="39" width="1" height="6" fill="#4a443a" />
      <rect x="15" y="39" width="1" height="14" fill="#1a1512" />
      {/* knee wrap */}
      <rect x="11" y="44" width="5" height="1" fill="#4f3722" />
      <rect x="11" y="44" width="2" height="1" fill="#6e4e30" />
      {/* right (trailing) leg — stepped back+right, deeper shadow */}
      <rect x="19" y="38" width="7" height="16" fill="#150d08" />
      <rect x="20" y="39" width="5" height="14" fill="#241e16" />
      <rect x="20" y="39" width="1" height="14" fill="#352c22" />
      <rect x="24" y="39" width="1" height="14" fill="#16110c" />
      <rect x="20" y="44" width="5" height="1" fill="#3a2a18" />
      {/* teal kiss down the trailing calf */}
      <rect x="24" y="47" width="1" height="4" fill="#2e5a52" opacity="0.55" />

      {/* ── Boots — soft leather, silent soles ── */}
      <rect x="9" y="53" width="9" height="5" fill="#150d08" />
      <rect x="10" y="54" width="7" height="3" fill="#1c1814" />
      <rect x="10" y="54" width="7" height="1" fill="#2a2420" />
      <rect x="10" y="54" width="3" height="1" fill="#3a332c" />
      <rect x="10" y="56" width="7" height="1" fill="#0e0b09" />
      <rect x="10" y="54" width="1" height="1" fill="#4a7268" opacity="0.7" />
      <rect x="21" y="53" width="9" height="5" fill="#150d08" />
      <rect x="22" y="54" width="7" height="3" fill="#1c1814" />
      <rect x="22" y="54" width="7" height="1" fill="#2a2420" />
      <rect x="22" y="56" width="7" height="1" fill="#0e0b09" />
    </svg>
  );
}

function WizardSvg({ className }: { className?: string }) {
  // 36×60. Tall canted hat, layered white beard, violet robe with arcane
  // sash, crystal-headed staff, blood-red tome. Cold blue arcane eyes.
  return (
    <svg
      viewBox="0 0 36 60"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="Wizard"
    >
      {/* Backlight — arcane violet bloom + faint amber counter-key */}
      <ellipse cx="16" cy="27" rx="19" ry="28" fill="#7a5db8" opacity="0.13" />
      <ellipse cx="23" cy="23" rx="15" ry="21" fill="#e8a020" opacity="0.05" />
      <ellipse cx="16" cy="21" rx="13" ry="19" fill="#a48ee0" opacity="0.07" />
      {/* Ground-contact shadow */}
      <ellipse cx="18" cy="58.4" rx="13" ry="2.1" fill="#000" opacity="0.45" />

      {/* ── Pointed hat — tall cone canted right, starred, banded ── */}
      {/* outline */}
      <rect x="21" y="0" width="4" height="2" fill="#150d08" />
      <rect x="20" y="1" width="5" height="2" fill="#150d08" />
      <rect x="19" y="2" width="6" height="2" fill="#150d08" />
      <rect x="17" y="3" width="8" height="2" fill="#150d08" />
      <rect x="16" y="4" width="10" height="2" fill="#150d08" />
      <rect x="14" y="5" width="12" height="2" fill="#150d08" />
      <rect x="13" y="6" width="14" height="2" fill="#150d08" />
      <rect x="12" y="7" width="15" height="2" fill="#150d08" />
      <rect x="7" y="9" width="23" height="4" fill="#150d08" />
      {/* cone fill */}
      <rect x="22" y="1" width="2" height="1" fill="#503d78" />
      <rect x="21" y="2" width="3" height="1" fill="#3a2a5a" />
      <rect x="20" y="3" width="4" height="1" fill="#3a2a5a" />
      <rect x="18" y="4" width="7" height="1" fill="#3a2a5a" />
      <rect x="17" y="5" width="8" height="1" fill="#3a2a5a" />
      <rect x="15" y="6" width="11" height="1" fill="#3a2a5a" />
      <rect x="14" y="7" width="12" height="1" fill="#3a2a5a" />
      <rect x="13" y="8" width="13" height="1" fill="#3a2a5a" />
      {/* lit left slope + hot rim */}
      <rect x="22" y="1" width="1" height="1" fill="#8a70c8" />
      <rect x="21" y="2" width="1" height="1" fill="#6a52a0" />
      <rect x="20" y="3" width="1" height="1" fill="#6a52a0" />
      <rect x="18" y="4" width="2" height="1" fill="#6a52a0" />
      <rect x="17" y="5" width="2" height="1" fill="#503d78" />
      <rect x="15" y="6" width="2" height="1" fill="#6a52a0" />
      <rect x="14" y="7" width="2" height="1" fill="#503d78" />
      <rect x="13" y="8" width="2" height="1" fill="#6a52a0" />
      {/* shadow right of cone */}
      <rect x="23" y="2" width="1" height="1" fill="#2a1d48" />
      <rect x="23" y="3" width="1" height="2" fill="#2a1d48" />
      <rect x="24" y="4" width="1" height="2" fill="#221640" />
      <rect x="24" y="6" width="2" height="3" fill="#221640" />
      <rect x="22" y="6" width="2" height="3" fill="#2a1d48" />
      {/* gold star pips on the cone */}
      <rect x="19" y="5" width="1" height="1" fill="#c89a48" />
      <rect x="21" y="7" width="1" height="1" fill="#9a7232" />
      {/* band + glowing sigil */}
      <rect x="13" y="9" width="13" height="1" fill="#221640" />
      <rect x="18" y="9" width="3" height="1" fill="#2a1d48" />
      <rect x="19" y="9" width="1" height="1" fill="#c4b0f0" />
      {/* wide brim — lit top-left, dark underside */}
      <rect x="8" y="10" width="21" height="1" fill="#503d78" />
      <rect x="8" y="10" width="9" height="1" fill="#6a52a0" />
      <rect x="8" y="10" width="4" height="1" fill="#8a70c8" />
      <rect x="8" y="11" width="21" height="1" fill="#3a2a5a" />
      <rect x="8" y="12" width="21" height="1" fill="#221640" />

      {/* ── Face — shadowed under the brim, arcane eyes ── */}
      <rect x="12" y="13" width="13" height="6" fill="#150d08" />
      <rect x="13" y="13" width="11" height="6" fill="#b8905c" />
      <rect x="13" y="13" width="11" height="1" fill="#95714a" />
      <rect x="13" y="13" width="2" height="6" fill="#d4ad78" />
      <rect x="22" y="13" width="2" height="6" fill="#6f5236" />
      {/* cold blue arcane eyes + core */}
      <rect x="15" y="15" width="2" height="1" fill="#9ab0ff" />
      <rect x="20" y="15" width="2" height="1" fill="#9ab0ff" />
      <rect x="15" y="15" width="1" height="1" fill="#e8f0ff" />
      <rect x="20" y="15" width="1" height="1" fill="#e8f0ff" />
      {/* crow's feet + brow knit */}
      <rect x="14" y="14" width="3" height="1" fill="#6f5236" />
      <rect x="19" y="14" width="3" height="1" fill="#6f5236" />
      {/* nose */}
      <rect x="18" y="16" width="1" height="2" fill="#95714a" />

      {/* ── White beard — long, layered, tapering ── */}
      <rect x="11" y="17" width="15" height="4" fill="#150d08" />
      <rect x="12" y="20" width="13" height="3" fill="#150d08" />
      <rect x="13" y="23" width="11" height="3" fill="#150d08" />
      <rect x="15" y="26" width="7" height="2" fill="#150d08" />
      {/* moustache */}
      <rect x="14" y="17" width="9" height="1" fill="#e8e0cc" />
      <rect x="14" y="17" width="4" height="1" fill="#f8f2e2" />
      {/* beard mass */}
      <rect x="12" y="18" width="13" height="3" fill="#cfc7b2" />
      <rect x="13" y="21" width="11" height="3" fill="#bcb4a0" />
      <rect x="14" y="24" width="9" height="2" fill="#a89e88" />
      <rect x="16" y="26" width="5" height="1" fill="#8a8270" />
      {/* lit left fall + strand shadows */}
      <rect x="12" y="18" width="2" height="4" fill="#e8e0cc" />
      <rect x="13" y="18" width="1" height="6" fill="#f8f2e2" />
      <rect x="17" y="18" width="1" height="7" fill="#a89e88" />
      <rect x="20" y="18" width="1" height="6" fill="#a89e88" />
      <rect x="23" y="18" width="2" height="3" fill="#8a8270" />
      <rect x="15" y="20" width="1" height="4" fill="#e8e0cc" />

      {/* ── Robe — wide violet fall, gold trim, arcane sash ── */}
      {/* outline */}
      <rect x="8" y="19" width="21" height="2" fill="#150d08" />
      <rect x="7" y="21" width="23" height="26" fill="#150d08" />
      {/* shoulders */}
      <rect x="9" y="20" width="19" height="2" fill="#3a2a5a" />
      <rect x="9" y="20" width="4" height="1" fill="#503d78" />
      {/* body */}
      <rect x="8" y="22" width="21" height="24" fill="#3a2a5a" />
      <rect x="8" y="22" width="2" height="24" fill="#2a1d48" />
      <rect x="8" y="22" width="1" height="24" fill="#221640" />
      <rect x="10" y="22" width="2" height="24" fill="#503d78" />
      <rect x="10" y="22" width="1" height="10" fill="#6a52a0" />
      <rect x="26" y="22" width="3" height="24" fill="#2a1d48" />
      <rect x="28" y="22" width="1" height="24" fill="#221640" />
      <rect x="17" y="22" width="2" height="24" fill="#473570" />
      {/* robe dither */}
      <rect x="13" y="30" width="1" height="1" fill="#503d78" />
      <rect x="23" y="33" width="1" height="1" fill="#221640" />
      <rect x="12" y="38" width="1" height="1" fill="#2a1d48" />
      <rect x="21" y="41" width="1" height="1" fill="#503d78" />
      <rect x="15" y="43" width="1" height="1" fill="#2a1d48" />
      {/* glowing arcane sash */}
      <ellipse cx="18" cy="30" rx="7" ry="3" fill="#a48ee0" opacity="0.14" />
      <rect x="12" y="28" width="5" height="1" fill="#a48ee0" />
      <rect x="15" y="29" width="5" height="1" fill="#a48ee0" />
      <rect x="18" y="30" width="5" height="1" fill="#8a70c8" />
      <rect x="13" y="28" width="2" height="1" fill="#d4c4f8" />
      {/* gold trim near hem */}
      <rect x="8" y="44" width="21" height="1" fill="#9a7232" />
      <rect x="8" y="44" width="8" height="1" fill="#c89a48" />
      <rect x="10" y="44" width="2" height="1" fill="#ecc46a" />
      {/* hem zigzag cuts */}
      <rect x="8" y="45" width="21" height="1" fill="#221640" />
      <polygon points="8,46 11,49 14,46" fill="#2a1d48" />
      <polygon points="14,46 17,49 20,46" fill="#3a2a5a" />
      <polygon points="20,46 23,49 26,46" fill="#2a1d48" />
      <polygon points="26,46 28,48 29,46" fill="#221640" />

      {/* ── Tome — cradled left, blood leather, gold clasp ── */}
      <rect x="2" y="27" width="9" height="9" fill="#150d08" />
      <rect x="3" y="28" width="7" height="7" fill="#7e1f2c" />
      <rect x="3" y="28" width="7" height="1" fill="#a93340" />
      <rect x="3" y="28" width="3" height="1" fill="#d05452" />
      <rect x="3" y="34" width="7" height="1" fill="#531320" />
      <rect x="3" y="28" width="1" height="7" fill="#531320" />
      {/* page block edge */}
      <rect x="9" y="29" width="1" height="5" fill="#e8e0cc" />
      <rect x="9" y="29" width="1" height="2" fill="#f8f2e2" />
      {/* gold clasp + corner caps */}
      <rect x="5" y="30" width="3" height="2" fill="#c89a48" />
      <rect x="6" y="30" width="1" height="1" fill="#fff0b8" />
      <rect x="3" y="28" width="1" height="1" fill="#ecc46a" />
      <rect x="3" y="34" width="1" height="1" fill="#9a7232" />
      {/* left sleeve over the tome */}
      <rect x="6" y="22" width="6" height="6" fill="#150d08" />
      <rect x="7" y="23" width="4" height="4" fill="#3a2a5a" />
      <rect x="7" y="23" width="1" height="4" fill="#503d78" />
      <rect x="7" y="26" width="4" height="1" fill="#2a1d48" />

      {/* ── Staff — right side, gnarled, crystal head ── */}
      {/* right sleeve reaching out */}
      <rect x="25" y="22" width="7" height="6" fill="#150d08" />
      <rect x="26" y="23" width="5" height="4" fill="#3a2a5a" />
      <rect x="26" y="23" width="1" height="4" fill="#503d78" />
      {/* hand gripping */}
      <rect x="29" y="26" width="5" height="4" fill="#150d08" />
      <rect x="30" y="27" width="3" height="2" fill="#b8905c" />
      <rect x="30" y="27" width="3" height="1" fill="#d4ad78" />
      {/* shaft */}
      <rect x="29" y="6" width="4" height="48" fill="#150d08" />
      <rect x="30" y="7" width="2" height="46" fill="#4f3722" />
      <rect x="30" y="7" width="1" height="46" fill="#6e4e30" />
      <rect x="30" y="14" width="2" height="1" fill="#33231a" />
      <rect x="30" y="34" width="2" height="1" fill="#33231a" />
      <rect x="30" y="44" width="2" height="1" fill="#33231a" />
      {/* crystal — layered bloom + faceted core */}
      <ellipse cx="31" cy="3" rx="7" ry="6" fill="#a48ee0" opacity="0.24" />
      <ellipse cx="31" cy="3" rx="4" ry="3.5" fill="#c4b0f0" opacity="0.30" />
      <rect x="28" y="0" width="6" height="7" fill="#150d08" />
      <rect x="29" y="1" width="4" height="5" fill="#a48ee0" />
      <rect x="29" y="1" width="2" height="3" fill="#c4b0f0" />
      <rect x="29" y="1" width="1" height="2" fill="#e8d4ff" />
      <rect x="30" y="2" width="1" height="1" fill="#ffffff" />
      <rect x="32" y="3" width="1" height="3" fill="#6a52a0" />
      {/* claw prongs holding the crystal */}
      <rect x="28" y="5" width="1" height="2" fill="#33231a" />
      <rect x="33" y="5" width="1" height="2" fill="#33231a" />
      {/* drifting motes */}
      <rect x="26" y="2" width="1" height="1" fill="#d4c4f8" opacity="0.9" />
      <rect x="34" y="8" width="1" height="1" fill="#a48ee0" opacity="0.7" />
      <rect x="27" y="12" width="1" height="1" fill="#8a70c8" opacity="0.6" />

      {/* ── Boots peeking under the hem ── */}
      <rect x="10" y="49" width="7" height="9" fill="#150d08" />
      <rect x="11" y="50" width="5" height="7" fill="#221814" />
      <rect x="11" y="50" width="5" height="1" fill="#33231a" />
      <rect x="11" y="56" width="5" height="1" fill="#0e0b09" />
      <rect x="19" y="49" width="7" height="9" fill="#150d08" />
      <rect x="20" y="50" width="5" height="7" fill="#221814" />
      <rect x="20" y="50" width="5" height="1" fill="#33231a" />
      <rect x="20" y="56" width="5" height="1" fill="#0e0b09" />
    </svg>
  );
}

function BarbarianSvg({ className }: { className?: string }) {
  // 36×60. Massive bare torso with war paint and scars, wolf-pelt shoulder,
  // diagonal greataxe gripped high and low, fur boots. Blood-rage backlight.
  return (
    <svg
      viewBox="0 0 36 60"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="Barbarian"
    >
      {/* Backlight — blood-warm rage haze + cool counter-rim */}
      <ellipse cx="16" cy="26" rx="19" ry="27" fill="#b5302c" opacity="0.11" />
      <ellipse cx="23" cy="23" rx="15" ry="21" fill="#4a6a72" opacity="0.05" />
      <ellipse cx="16" cy="19" rx="12" ry="16" fill="#e8a020" opacity="0.06" />
      {/* Ground-contact shadow */}
      <ellipse cx="18" cy="58.4" rx="13" ry="2.1" fill="#000" opacity="0.45" />


      {/* ── Head — wild hair, glare, war paint ── */}
      {/* topknot + loose strands */}
      <rect x="15" y="0" width="5" height="3" fill="#150d08" />
      <rect x="16" y="1" width="3" height="2" fill="#4a2e18" />
      <rect x="16" y="1" width="1" height="1" fill="#6e4423" />
      {/* skull outline */}
      <rect x="11" y="3" width="14" height="11" fill="#150d08" />
      <rect x="12" y="14" width="12" height="1" fill="#150d08" />
      {/* hair crown */}
      <rect x="12" y="4" width="12" height="3" fill="#2a1810" />
      <rect x="12" y="4" width="12" height="1" fill="#4a2e18" />
      <rect x="12" y="4" width="5" height="1" fill="#6e4423" />
      {/* loose strand */}
      <rect x="12" y="7" width="1" height="3" fill="#2a1810" />
      <rect x="23" y="7" width="1" height="2" fill="#2a1810" />
      {/* face */}
      <rect x="12" y="7" width="12" height="7" fill="#b8905c" />
      <rect x="12" y="7" width="1" height="7" fill="#95714a" />
      <rect x="13" y="7" width="2" height="6" fill="#d4ad78" />
      <rect x="22" y="7" width="2" height="7" fill="#6f5236" />
      {/* heavy brow */}
      <rect x="13" y="8" width="10" height="1" fill="#6f5236" />
      {/* feral amber eyes in shadowed sockets */}
      <rect x="14" y="9" width="3" height="2" fill="#3a2a18" />
      <rect x="20" y="9" width="3" height="2" fill="#3a2a18" />
      <rect x="15" y="9" width="2" height="1" fill="#ffd24a" />
      <rect x="20" y="9" width="2" height="1" fill="#ffd24a" />
      <rect x="15" y="9" width="1" height="1" fill="#fff4c0" />
      {/* war-paint slashes under each eye */}
      <rect x="14" y="11" width="2" height="1" fill="#c23030" />
      <rect x="15" y="12" width="1" height="1" fill="#8e1f1f" />
      <rect x="21" y="11" width="2" height="1" fill="#c23030" />
      <rect x="21" y="12" width="1" height="1" fill="#8e1f1f" />
      {/* snarl + clenched jaw */}
      <rect x="17" y="12" width="3" height="1" fill="#6f5236" />
      <rect x="13" y="13" width="10" height="1" fill="#95714a" />
      <rect x="15" y="13" width="7" height="1" fill="#7e5a38" opacity="0.6" />
      {/* bull neck */}
      <rect x="14" y="15" width="9" height="2" fill="#95714a" />
      <rect x="14" y="15" width="4" height="1" fill="#b8905c" />

      {/* ── Shoulders — massive; wolf-pelt over the right ── */}
      {/* outline */}
      <rect x="3" y="16" width="31" height="4" fill="#150d08" />
      {/* deltoids */}
      <rect x="4" y="17" width="29" height="2" fill="#b8905c" />
      <rect x="4" y="17" width="29" height="1" fill="#d4ad78" />
      <rect x="5" y="17" width="5" height="1" fill="#ecd0a0" />
      <rect x="4" y="18" width="2" height="1" fill="#95714a" />
      <rect x="31" y="17" width="2" height="2" fill="#6f5236" />
      {/* ── Torso — bare, carved, painted ── */}
      {/* outline */}
      <rect x="7" y="19" width="23" height="14" fill="#150d08" />
      {/* mass */}
      <rect x="8" y="20" width="21" height="12" fill="#b8905c" />
      <rect x="8" y="20" width="2" height="12" fill="#95714a" />
      <rect x="8" y="20" width="1" height="12" fill="#7e6240" />
      <rect x="26" y="20" width="3" height="12" fill="#8a6a44" />
      <rect x="28" y="20" width="1" height="12" fill="#6f5236" />
      {/* lit pec block */}
      <rect x="10" y="20" width="4" height="3" fill="#d4ad78" />
      <rect x="10" y="20" width="3" height="1" fill="#ecd0a0" />
      {/* sternum + pec line */}
      <rect x="18" y="20" width="1" height="8" fill="#95714a" />
      <rect x="12" y="23" width="5" height="1" fill="#95714a" />
      <rect x="20" y="23" width="5" height="1" fill="#8a6a44" />
      {/* abs — staggered, soft */}
      <rect x="14" y="26" width="3" height="1" fill="#a8845a" />
      <rect x="20" y="26" width="3" height="1" fill="#8a6a44" />
      <rect x="13" y="29" width="3" height="1" fill="#a8845a" />
      <rect x="20" y="29" width="3" height="1" fill="#8a6a44" />
      {/* red war-paint chevrons across the chest */}
      <rect x="11" y="21" width="3" height="1" fill="#c23030" />
      <rect x="14" y="22" width="2" height="1" fill="#c23030" />
      <rect x="21" y="21" width="3" height="1" fill="#8e1f1f" />
      <rect x="20" y="22" width="2" height="1" fill="#8e1f1f" />
      <rect x="11" y="21" width="1" height="1" fill="#f04438" />
      {/* old scar slashes */}
      <rect x="22" y="26" width="1" height="1" fill="#7e5a38" />
      <rect x="23" y="27" width="1" height="1" fill="#7e5a38" />
      <rect x="24" y="28" width="1" height="1" fill="#7e5a38" />
      <rect x="12" y="26" width="1" height="1" fill="#d4ad78" />

      {/* ── Left arm — free fist raised in rage ── */}
      <rect x="3" y="17" width="5" height="6" fill="#150d08" />
      <rect x="4" y="18" width="3" height="4" fill="#b8905c" />
      <rect x="4" y="18" width="1" height="4" fill="#d4ad78" />
      <rect x="2" y="12" width="5" height="6" fill="#150d08" />
      <rect x="3" y="13" width="3" height="4" fill="#a8845a" />
      <rect x="3" y="13" width="1" height="4" fill="#c29c6a" />
      {/* leather bracer at the wrist */}
      <rect x="2" y="14" width="5" height="2" fill="#150d08" />
      <rect x="3" y="14" width="3" height="2" fill="#4f3722" />
      <rect x="3" y="14" width="3" height="1" fill="#6e4e30" />
      {/* clenched fist + knuckle light */}
      <rect x="2" y="8" width="6" height="5" fill="#150d08" />
      <rect x="3" y="9" width="4" height="3" fill="#b8905c" />
      <rect x="3" y="9" width="4" height="1" fill="#d4ad78" />
      <rect x="3" y="9" width="2" height="1" fill="#ecd0a0" />
      <rect x="6" y="10" width="1" height="2" fill="#95714a" />
      <rect x="4" y="10" width="1" height="1" fill="#95714a" />

      {/* ── Fur belt + loincloth ── */}
      <rect x="9" y="33" width="19" height="4" fill="#150d08" />
      <rect x="10" y="34" width="17" height="2" fill="#5a4630" />
      <rect x="10" y="34" width="17" height="1" fill="#7a6244" />
      <rect x="10" y="34" width="6" height="1" fill="#8a7252" />
      {/* fang trophy on the belt */}
      <rect x="17" y="35" width="2" height="2" fill="#e8dcc0" />
      <rect x="17" y="35" width="1" height="1" fill="#fff8e0" />
      {/* loincloth drop */}
      <rect x="14" y="36" width="9" height="8" fill="#150d08" />
      <rect x="15" y="37" width="7" height="6" fill="#4f3722" />
      <rect x="15" y="37" width="2" height="6" fill="#6e4e30" />
      <rect x="20" y="37" width="2" height="6" fill="#33231a" />
      <rect x="15" y="42" width="7" height="1" fill="#33231a" />

      {/* ── Greataxe — raised beside the head, vertical haft ── */}
      {/* haft — red-brown wood so it separates from the skin */}
      <rect x="27" y="8" width="4" height="26" fill="#150d08" />
      <rect x="28" y="9" width="2" height="24" fill="#2a1810" />
      <rect x="28" y="9" width="1" height="24" fill="#a86a32" />
      {/* grip wrap + pommel knob */}
      <rect x="28" y="22" width="2" height="2" fill="#1c130c" />
      <rect x="28" y="31" width="2" height="2" fill="#33231a" />
      <rect x="28" y="32" width="2" height="1" fill="#1c130c" />
      {/* double-bit head — steel lobes, blazing edges */}
      <rect x="23" y="0" width="13" height="9" fill="#150d08" />
      <rect x="24" y="1" width="5" height="7" fill="#5a6274" />
      <rect x="30" y="1" width="5" height="7" fill="#4e586a" />
      <rect x="24" y="1" width="5" height="2" fill="#7e8698" />
      <rect x="30" y="1" width="4" height="2" fill="#6d7689" />
      {/* bright cutting edges */}
      <rect x="24" y="1" width="1" height="7" fill="#dce6f4" />
      <rect x="23" y="2" width="1" height="5" fill="#ffffff" />
      <rect x="35" y="2" width="1" height="5" fill="#b4bcc8" />
      <rect x="34" y="1" width="1" height="7" fill="#9aa2b4" />
      {/* center socket + rivets */}
      <rect x="29" y="1" width="1" height="7" fill="#232c3a" />
      <rect x="27" y="3" width="1" height="1" fill="#161b24" />
      <rect x="31" y="3" width="1" height="1" fill="#161b24" />
      {/* nicked blade notch */}
      <rect x="23" y="4" width="1" height="1" fill="#150d08" />

      {/* ── Right arm — raised to the haft ── */}
      {/* upper arm rising from the deltoid */}
      <rect x="29" y="13" width="5" height="6" fill="#150d08" />
      <rect x="30" y="13" width="3" height="5" fill="#a8845a" />
      <rect x="30" y="13" width="1" height="5" fill="#c29c6a" />
      <rect x="32" y="13" width="1" height="5" fill="#7e6240" />
      {/* spiked iron bracer */}
      <rect x="29" y="16" width="5" height="2" fill="#150d08" />
      <rect x="30" y="16" width="3" height="1" fill="#4e586a" />
      <rect x="30" y="16" width="2" height="1" fill="#6d7689" />
      <rect x="33" y="15" width="1" height="1" fill="#8a91a4" />
      {/* fist wrapping the haft */}
      <rect x="25" y="9" width="8" height="5" fill="#150d08" />
      <rect x="26" y="10" width="6" height="3" fill="#b8905c" />
      <rect x="26" y="10" width="6" height="1" fill="#d4ad78" />
      <rect x="26" y="10" width="2" height="1" fill="#ecd0a0" />
      <rect x="31" y="11" width="1" height="2" fill="#95714a" />
      <rect x="28" y="11" width="1" height="1" fill="#95714a" />

      {/* ── Legs — bare, thick; shin wraps ── */}
      <rect x="9" y="36" width="7" height="18" fill="#150d08" />
      <rect x="10" y="37" width="5" height="16" fill="#b8905c" />
      <rect x="10" y="37" width="1" height="16" fill="#d4ad78" />
      <rect x="13" y="37" width="2" height="16" fill="#95714a" />
      <rect x="10" y="37" width="1" height="3" fill="#ecd0a0" />
      <rect x="20" y="36" width="7" height="18" fill="#150d08" />
      <rect x="21" y="37" width="5" height="16" fill="#a8845a" />
      <rect x="21" y="37" width="1" height="16" fill="#c29c6a" />
      <rect x="24" y="37" width="2" height="16" fill="#7e6240" />
      {/* knee shadows */}
      <rect x="10" y="44" width="5" height="1" fill="#95714a" />
      <rect x="21" y="44" width="5" height="1" fill="#7e6240" />
      {/* shin wraps */}
      <rect x="10" y="47" width="5" height="2" fill="#6e4e30" />
      <rect x="10" y="47" width="5" height="1" fill="#8f6a40" />
      <rect x="21" y="47" width="5" height="2" fill="#4f3722" />
      <rect x="21" y="47" width="5" height="1" fill="#6e4e30" />

      {/* ── Fur boots ── */}
      <rect x="8" y="53" width="9" height="5" fill="#150d08" />
      <rect x="9" y="54" width="7" height="3" fill="#4a3a2a" />
      <rect x="9" y="54" width="7" height="1" fill="#6e5a40" />
      <rect x="9" y="54" width="3" height="1" fill="#8a7252" />
      <rect x="9" y="56" width="7" height="1" fill="#241c12" />
      <polygon points="10,54 11,52 12,54" fill="#6e5a40" />
      <polygon points="13,54 14,52 15,54" fill="#4a3a2a" />
      <rect x="20" y="53" width="9" height="5" fill="#150d08" />
      <rect x="21" y="54" width="7" height="3" fill="#3a2c1e" />
      <rect x="21" y="54" width="7" height="1" fill="#5a4630" />
      <rect x="21" y="56" width="7" height="1" fill="#1c130c" />
      <polygon points="22,54 23,52 24,54" fill="#5a4630" />
      <polygon points="25,54 26,52 27,54" fill="#3a2c1e" />
    </svg>
  );
}

function RangerSvg({ className }: { className?: string }) {
  // 36×60. Hooded archer at full draw: recurve longbow, string pulled to the
  // cheek, bright arrowhead, quiver fletchings over the shoulder. One eye
  // squinted down the shaft. Forest-dusk backlight.
  return (
    <svg
      viewBox="0 0 36 60"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="Ranger"
    >
      {/* Backlight — cool forest dusk + warm amber key */}
      <ellipse cx="16" cy="26" rx="18" ry="27" fill="#2e4a22" opacity="0.13" />
      <ellipse cx="23" cy="23" rx="15" ry="21" fill="#4a8278" opacity="0.07" />
      <ellipse cx="16" cy="19" rx="12" ry="16" fill="#e8a020" opacity="0.05" />
      {/* Ground-contact shadow */}
      <ellipse cx="18" cy="58.4" rx="13" ry="2.1" fill="#000" opacity="0.45" />

      {/* ── Quiver — slung behind the right shoulder ── */}
      <rect x="25" y="7" width="7" height="13" fill="#150d08" />
      <rect x="26" y="8" width="5" height="11" fill="#4f3722" />
      <rect x="26" y="8" width="2" height="11" fill="#6e4e30" />
      <rect x="26" y="8" width="1" height="6" fill="#8f6a40" />
      <rect x="30" y="8" width="1" height="11" fill="#33231a" />
      <rect x="26" y="8" width="5" height="1" fill="#8f6a40" />
      {/* arrows — shafts + fletchings standing proud */}
      <rect x="27" y="4" width="1" height="5" fill="#b5a282" />
      <rect x="29" y="3" width="1" height="6" fill="#b5a282" />
      <rect x="26" y="3" width="1" height="2" fill="#c23030" />
      <rect x="27" y="2" width="1" height="2" fill="#e8dcc0" />
      <rect x="28" y="2" width="1" height="2" fill="#c23030" />
      <rect x="29" y="1" width="1" height="2" fill="#e8dcc0" />
      <rect x="30" y="2" width="1" height="2" fill="#c23030" />

      {/* ── Hood — deep green, peaked; face shadowed ── */}
      {/* outline */}
      <rect x="14" y="2" width="9" height="2" fill="#150d08" />
      <rect x="12" y="3" width="13" height="2" fill="#150d08" />
      <rect x="11" y="5" width="15" height="11" fill="#150d08" />
      {/* hood body */}
      <rect x="15" y="3" width="7" height="1" fill="#223818" />
      <rect x="13" y="4" width="11" height="1" fill="#2e4a22" />
      <rect x="12" y="5" width="13" height="10" fill="#2e4a22" />
      <rect x="22" y="5" width="3" height="10" fill="#1c3014" />
      <rect x="24" y="5" width="1" height="10" fill="#12200c" />
      {/* lit folds left + rim catch-light */}
      <rect x="12" y="5" width="2" height="9" fill="#3a5a2c" />
      <rect x="13" y="4" width="3" height="1" fill="#4a6b3a" />
      <rect x="13" y="4" width="2" height="1" fill="#5a8a3a" />
      <rect x="12" y="5" width="1" height="3" fill="#6a9a44" />
      <rect x="14" y="3" width="2" height="1" fill="#4a6b3a" />
      {/* hood throat wrap */}
      <rect x="12" y="14" width="13" height="1" fill="#1c3014" />
      {/* face in shadow */}
      <rect x="13" y="7" width="10" height="7" fill="#8a6a44" />
      <rect x="13" y="7" width="10" height="1" fill="#6f5236" />
      <rect x="13" y="7" width="2" height="7" fill="#a8845a" />
      <rect x="21" y="7" width="2" height="7" fill="#5c4226" />
      {/* aiming eyes — open sighting eye toward the target, off eye squinted */}
      <rect x="14" y="9" width="3" height="2" fill="#2a1c10" />
      <rect x="15" y="9" width="2" height="1" fill="#7ac84a" />
      <rect x="15" y="9" width="1" height="1" fill="#d2ff9a" />
      <rect x="20" y="10" width="2" height="1" fill="#3a2a18" />
      {/* set mouth + jaw */}
      <rect x="16" y="12" width="4" height="1" fill="#5c4226" />
      <rect x="14" y="13" width="8" height="1" fill="#6f5236" />

      {/* ── Cloak shoulders, falling down the right ── */}
      <rect x="8" y="16" width="21" height="4" fill="#150d08" />
      <rect x="9" y="17" width="19" height="2" fill="#2e4a22" />
      <rect x="9" y="17" width="19" height="1" fill="#3a5a2c" />
      <rect x="9" y="17" width="4" height="1" fill="#4a6b3a" />
      <rect x="24" y="17" width="4" height="2" fill="#1c3014" />
      <rect x="23" y="19" width="6" height="20" fill="#150d08" />
      <rect x="24" y="20" width="4" height="18" fill="#1c3014" />
      <rect x="24" y="20" width="1" height="18" fill="#2e4a22" />
      <rect x="27" y="20" width="1" height="18" fill="#12200c" />
      {/* ragged cloak hem */}
      <rect x="24" y="38" width="2" height="1" fill="#12200c" />
      <rect x="26" y="37" width="2" height="1" fill="#1c3014" />

      {/* ── Torso — leather jerkin over green tunic ── */}
      <rect x="10" y="19" width="14" height="15" fill="#150d08" />
      <rect x="11" y="20" width="12" height="13" fill="#3a2e22" />
      <rect x="11" y="20" width="2" height="13" fill="#4f3d2c" />
      <rect x="11" y="20" width="1" height="7" fill="#5e4a36" />
      <rect x="21" y="20" width="2" height="13" fill="#241c12" />
      {/* green tunic center */}
      <rect x="14" y="20" width="6" height="13" fill="#2e4a22" />
      <rect x="14" y="20" width="2" height="13" fill="#3a5a2c" />
      <rect x="18" y="20" width="2" height="13" fill="#22381a" />
      {/* quiver strap across the chest */}
      <rect x="11" y="21" width="12" height="1" fill="#1c130b" />
      <rect x="12" y="22" width="11" height="1" fill="#1c130b" />
      <rect x="13" y="21" width="1" height="1" fill="#6e4e30" />
      {/* strap buckle */}
      <rect x="16" y="21" width="2" height="2" fill="#8f6a40" />
      <rect x="16" y="21" width="1" height="1" fill="#c9a05a" />
      {/* jerkin lacing */}
      <rect x="16" y="26" width="1" height="1" fill="#5e4a36" />
      <rect x="17" y="28" width="1" height="1" fill="#5e4a36" />
      <rect x="16" y="30" width="1" height="1" fill="#5e4a36" />

      {/* ── Longbow — recurve, full height on the left ── */}
      {/* tips curling */}
      <rect x="4" y="1" width="3" height="2" fill="#150d08" />
      <rect x="5" y="2" width="1" height="1" fill="#8f6a40" />
      <rect x="4" y="46" width="3" height="2" fill="#150d08" />
      <rect x="5" y="46" width="1" height="1" fill="#6e4e30" />
      {/* upper limb */}
      <rect x="2" y="3" width="3" height="7" fill="#150d08" />
      <rect x="3" y="3" width="1" height="7" fill="#8f6a40" />
      <rect x="1" y="9" width="3" height="11" fill="#150d08" />
      <rect x="2" y="9" width="1" height="11" fill="#8f6a40" />
      <rect x="2" y="9" width="1" height="4" fill="#a8854e" />
      {/* riser / grip */}
      <rect x="1" y="20" width="4" height="7" fill="#150d08" />
      <rect x="2" y="21" width="2" height="5" fill="#6e4e30" />
      <rect x="2" y="21" width="1" height="5" fill="#8f6a40" />
      {/* lower limb */}
      <rect x="1" y="27" width="3" height="12" fill="#150d08" />
      <rect x="2" y="27" width="1" height="12" fill="#6e4e30" />
      <rect x="2" y="38" width="3" height="9" fill="#150d08" />
      <rect x="3" y="38" width="1" height="8" fill="#6e4e30" />
      {/* ── String at full draw — V to the nock ── */}
      <rect x="6" y="3" width="1" height="3" fill="#b5a282" />
      <rect x="7" y="5" width="1" height="3" fill="#b5a282" />
      <rect x="8" y="7" width="1" height="3" fill="#b5a282" />
      <rect x="9" y="9" width="1" height="3" fill="#b5a282" />
      <rect x="10" y="11" width="1" height="3" fill="#b5a282" />
      <rect x="11" y="13" width="1" height="3" fill="#b5a282" />
      <rect x="12" y="15" width="1" height="3" fill="#b5a282" />
      <rect x="13" y="17" width="1" height="3" fill="#b5a282" />
      <rect x="14" y="19" width="1" height="3" fill="#b5a282" />
      <rect x="15" y="21" width="1" height="3" fill="#b5a282" />
      <rect x="15" y="24" width="1" height="3" fill="#a59272" />
      <rect x="14" y="26" width="1" height="3" fill="#a59272" />
      <rect x="13" y="28" width="1" height="3" fill="#a59272" />
      <rect x="12" y="30" width="1" height="3" fill="#a59272" />
      <rect x="11" y="32" width="1" height="3" fill="#a59272" />
      <rect x="10" y="34" width="1" height="3" fill="#a59272" />
      <rect x="9" y="36" width="1" height="3" fill="#a59272" />
      <rect x="8" y="38" width="1" height="3" fill="#a59272" />
      <rect x="7" y="40" width="1" height="3" fill="#a59272" />
      <rect x="6" y="42" width="1" height="3" fill="#a59272" />
      <rect x="5" y="44" width="1" height="3" fill="#a59272" />

      {/* ── Arrow — nocked, head past the stave, fletching at the cheek ── */}
      <rect x="4" y="23" width="12" height="1" fill="#d8d8c0" />
      <rect x="4" y="23" width="5" height="1" fill="#ecece0" />
      {/* steel broadhead + spec */}
      <rect x="1" y="22" width="3" height="3" fill="#150d08" />
      <rect x="2" y="23" width="2" height="1" fill="#dce6f4" />
      <rect x="2" y="22" width="1" height="1" fill="#8a91a4" />
      <rect x="2" y="24" width="1" height="1" fill="#8a91a4" />
      <rect x="2" y="23" width="1" height="1" fill="#ffffff" />
      {/* fletching */}
      <rect x="13" y="22" width="1" height="1" fill="#c23030" />
      <rect x="14" y="21" width="1" height="2" fill="#e8dcc0" />
      <rect x="15" y="22" width="1" height="1" fill="#c23030" />
      <rect x="13" y="24" width="1" height="1" fill="#e8dcc0" />
      <rect x="14" y="24" width="1" height="1" fill="#c23030" />

      {/* ── Left arm — extended to the riser ── */}
      <rect x="8" y="19" width="4" height="3" fill="#150d08" />
      <rect x="9" y="20" width="2" height="1" fill="#2e4a22" />
      <rect x="5" y="20" width="5" height="3" fill="#150d08" />
      <rect x="6" y="21" width="3" height="1" fill="#2e4a22" />
      <rect x="6" y="21" width="1" height="1" fill="#3a5a2c" />
      {/* leather bracer */}
      <rect x="4" y="21" width="4" height="3" fill="#150d08" />
      <rect x="5" y="22" width="2" height="1" fill="#6e4e30" />
      {/* gloved hand on the riser */}
      <rect x="2" y="22" width="4" height="4" fill="#150d08" />
      <rect x="3" y="23" width="2" height="2" fill="#8f6a40" />
      <rect x="3" y="23" width="1" height="1" fill="#a8854e" />

      {/* ── Right arm — drawing, elbow flared high ── */}
      <rect x="21" y="19" width="6" height="4" fill="#150d08" />
      <rect x="22" y="20" width="4" height="2" fill="#2e4a22" />
      <rect x="22" y="20" width="4" height="1" fill="#3a5a2c" />
      {/* forearm pulling to the nock */}
      <rect x="17" y="21" width="6" height="4" fill="#150d08" />
      <rect x="18" y="22" width="4" height="2" fill="#2e4a22" />
      <rect x="18" y="22" width="4" height="1" fill="#3a5a2c" />
      {/* draw hand at the fletching */}
      <rect x="15" y="21" width="4" height="4" fill="#150d08" />
      <rect x="16" y="22" width="2" height="2" fill="#8f6a40" />
      <rect x="16" y="22" width="1" height="1" fill="#a8854e" />

      {/* ── Belt + pouch ── */}
      <rect x="10" y="33" width="14" height="3" fill="#150d08" />
      <rect x="11" y="34" width="12" height="2" fill="#1c130b" />
      <rect x="11" y="34" width="12" height="1" fill="#33231a" />
      <rect x="19" y="34" width="3" height="3" fill="#150d08" />
      <rect x="20" y="35" width="2" height="2" fill="#4f3722" />
      <rect x="20" y="35" width="2" height="1" fill="#6e4e30" />

      {/* ── Legs — ranger greens, long boots ── */}
      <rect x="10" y="36" width="7" height="14" fill="#150d08" />
      <rect x="11" y="37" width="5" height="12" fill="#2a3520" />
      <rect x="11" y="37" width="2" height="12" fill="#36462a" />
      <rect x="11" y="37" width="1" height="5" fill="#42583a" />
      <rect x="15" y="37" width="1" height="12" fill="#1c2814" />
      <rect x="19" y="36" width="7" height="14" fill="#150d08" />
      <rect x="20" y="37" width="5" height="12" fill="#222c1a" />
      <rect x="20" y="37" width="1" height="12" fill="#2e3c24" />
      <rect x="24" y="37" width="1" height="12" fill="#141e0e" />
      {/* knee patches */}
      <rect x="11" y="42" width="5" height="1" fill="#4f3722" />
      <rect x="20" y="42" width="5" height="1" fill="#3a2a18" />

      {/* ── Boots — folded tops, travel-worn ── */}
      <rect x="9" y="49" width="8" height="9" fill="#150d08" />
      <rect x="10" y="50" width="6" height="7" fill="#2a2014" />
      <rect x="10" y="50" width="6" height="2" fill="#4f3d2c" />
      <rect x="10" y="50" width="3" height="1" fill="#5e4a36" />
      <rect x="10" y="56" width="6" height="1" fill="#140e08" />
      <rect x="19" y="49" width="8" height="9" fill="#150d08" />
      <rect x="20" y="50" width="6" height="7" fill="#241b10" />
      <rect x="20" y="50" width="6" height="2" fill="#42321e" />
      <rect x="20" y="56" width="6" height="1" fill="#100b06" />
    </svg>
  );
}

function PaladinSvg({ className }: { className?: string }) {
  // 36×60. Halvar: shaved scalp + topknot, crimson brow stripe, white-gold
  // tabard over steel, radiant raised sword, open healing palm, Pip on the
  // left shoulder. Halo bloom sells the oath.
  return (
    <svg
      viewBox="0 0 36 60"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="Paladin"
    >
      {/* Backlight — holy gold radiance + cool steel rim + halo */}
      <ellipse cx="17" cy="25" rx="19" ry="27" fill="#f4d042" opacity="0.10" />
      <ellipse cx="23" cy="23" rx="15" ry="23" fill="#4a6a90" opacity="0.06" />
      <ellipse cx="17" cy="8" rx="9" ry="7" fill="#fff4c0" opacity="0.12" />
      {/* Ground-contact shadow */}
      <ellipse cx="18" cy="58.4" rx="13" ry="2.1" fill="#000" opacity="0.45" />

      {/* ── Head — shaved scalp, weathered face ── */}
      {/* outline */}
      <rect x="12" y="3" width="13" height="2" fill="#150d08" />
      <rect x="11" y="5" width="15" height="9" fill="#150d08" />
      <rect x="13" y="14" width="11" height="1" fill="#150d08" />
      {/* scalp — lit crown */}
      <rect x="13" y="4" width="11" height="2" fill="#b8905c" />
      <rect x="13" y="4" width="8" height="1" fill="#d4ad78" />
      <rect x="14" y="4" width="4" height="1" fill="#ecd0a0" />
      <rect x="22" y="4" width="2" height="2" fill="#95714a" />
      {/* face */}
      <rect x="12" y="6" width="13" height="8" fill="#b8905c" />
      <rect x="12" y="6" width="1" height="8" fill="#95714a" />
      <rect x="13" y="6" width="2" height="7" fill="#d4ad78" />
      <rect x="23" y="6" width="2" height="8" fill="#6f5236" />
      <rect x="22" y="6" width="1" height="8" fill="#95714a" />
      {/* crimson war-paint stripe across the brow */}
      <rect x="12" y="7" width="13" height="2" fill="#a93340" />
      <rect x="12" y="7" width="3" height="1" fill="#d05452" />
      <rect x="13" y="7" width="1" height="1" fill="#f08a6a" />
      <rect x="23" y="7" width="2" height="2" fill="#7e1f2c" />
      {/* glaring eyes under the stripe + amber zeal glint */}
      <rect x="14" y="9" width="3" height="2" fill="#f6ecd8" />
      <rect x="20" y="9" width="3" height="2" fill="#e8d8bc" />
      <rect x="15" y="9" width="2" height="2" fill="#2a1c10" />
      <rect x="21" y="9" width="2" height="2" fill="#2a1c10" />
      <rect x="15" y="9" width="1" height="1" fill="#ffd24a" />
      <rect x="21" y="9" width="1" height="1" fill="#ffd24a" />
      <rect x="14" y="8" width="3" height="1" fill="#6f5236" />
      <rect x="20" y="8" width="3" height="1" fill="#6f5236" />
      {/* nose + set jaw + stubble */}
      <rect x="18" y="10" width="1" height="2" fill="#95714a" />
      <rect x="19" y="11" width="1" height="1" fill="#6f5236" />
      <rect x="15" y="12" width="7" height="1" fill="#95714a" />
      <rect x="16" y="12" width="5" height="1" fill="#5c4226" opacity="0.6" />
      <rect x="14" y="13" width="9" height="1" fill="#8a6a44" />
      {/* scar nick over the left cheek */}
      <rect x="22" y="10" width="1" height="3" fill="#7e5a38" />
      {/* neck */}
      <rect x="15" y="15" width="7" height="2" fill="#95714a" />
      <rect x="15" y="15" width="7" height="1" fill="#b8905c" />

      {/* ── Topknot scalplock — sits on the crown ── */}
      <rect x="16" y="1" width="5" height="4" fill="#150d08" />
      <rect x="17" y="2" width="2" height="3" fill="#4a2e18" />
      <rect x="19" y="2" width="1" height="2" fill="#33231a" />
      <rect x="17" y="2" width="1" height="1" fill="#6e4423" />

      {/* ── Pauldrons — steel with gold trim ── */}
      {/* left (under Pip) */}
      <rect x="5" y="15" width="10" height="6" fill="#150d08" />
      <rect x="6" y="16" width="8" height="3" fill="#6d7689" />
      <rect x="6" y="16" width="8" height="1" fill="#939cb0" />
      <rect x="6" y="16" width="3" height="1" fill="#c8cfe0" />
      <rect x="6" y="19" width="8" height="1" fill="#39424f" />
      <rect x="6" y="20" width="8" height="1" fill="#c89a48" />
      <rect x="6" y="20" width="3" height="1" fill="#ecc46a" />
      {/* right */}
      <rect x="22" y="15" width="10" height="6" fill="#150d08" />
      <rect x="23" y="16" width="8" height="3" fill="#4e586a" />
      <rect x="23" y="16" width="2" height="1" fill="#6d7689" />
      <rect x="29" y="16" width="2" height="4" fill="#232c3a" />
      <rect x="23" y="19" width="8" height="1" fill="#232c3a" />
      <rect x="23" y="20" width="8" height="1" fill="#9a7232" />
      <rect x="30" y="17" width="1" height="3" fill="#2e4a4e" opacity="0.8" />

      {/* ── Pip — miniature giant space hamster, perched on the left pauldron ── */}
      {/* ears */}
      <rect x="4" y="10" width="2" height="2" fill="#150d08" />
      <rect x="8" y="10" width="2" height="2" fill="#150d08" />
      <rect x="4" y="11" width="1" height="1" fill="#b07434" />
      <rect x="8" y="11" width="1" height="1" fill="#8c5a28" />
      {/* body — overlaps the pauldron top so he reads perched */}
      <rect x="3" y="11" width="8" height="6" fill="#150d08" />
      <rect x="4" y="12" width="6" height="4" fill="#a8743a" />
      <rect x="4" y="12" width="6" height="1" fill="#cc9650" />
      <rect x="4" y="12" width="3" height="1" fill="#e8bc74" />
      <rect x="4" y="15" width="6" height="1" fill="#7e5226" />
      <rect x="9" y="13" width="1" height="3" fill="#7e5226" />
      {/* white belly bib */}
      <rect x="5" y="14" width="3" height="1" fill="#e8d8c0" />
      {/* face — black eyes + glint, pink nose */}
      <rect x="5" y="13" width="1" height="1" fill="#0a0806" />
      <rect x="7" y="13" width="1" height="1" fill="#0a0806" />
      <rect x="5" y="13" width="1" height="1" fill="#ffd24a" opacity="0.9" />
      <rect x="6" y="14" width="1" height="1" fill="#d4806a" />
      {/* tiny paw over the pauldron edge */}
      <rect x="5" y="16" width="2" height="1" fill="#cc9650" />

      {/* ── Cuirass + white tabard ── */}
      {/* outline */}
      <rect x="11" y="17" width="15" height="16" fill="#150d08" />
      {/* steel sides */}
      <rect x="12" y="18" width="13" height="14" fill="#4e586a" />
      <rect x="12" y="18" width="2" height="14" fill="#6d7689" />
      <rect x="12" y="18" width="1" height="14" fill="#939cb0" />
      <rect x="23" y="18" width="2" height="14" fill="#39424f" />
      <rect x="24" y="18" width="1" height="14" fill="#232c3a" />
      {/* white tabard center panel — cloth ramp */}
      <rect x="14" y="18" width="9" height="14" fill="#cfc7b2" />
      <rect x="14" y="18" width="3" height="14" fill="#e8e0cc" />
      <rect x="14" y="18" width="1" height="14" fill="#f8f2e2" />
      <rect x="21" y="18" width="2" height="14" fill="#a89e88" />
      <rect x="22" y="18" width="1" height="14" fill="#8a8270" />
      {/* cloth folds + dither */}
      <rect x="18" y="26" width="1" height="6" fill="#a89e88" />
      <rect x="16" y="28" width="1" height="1" fill="#a89e88" />
      <rect x="20" y="24" width="1" height="1" fill="#8a8270" />
      {/* gold collar */}
      <rect x="14" y="18" width="9" height="1" fill="#c89a48" />
      <rect x="14" y="18" width="3" height="1" fill="#ecc46a" />
      {/* radiant sunburst emblem — gold rays + hot core + bloom */}
      <ellipse cx="18.5" cy="23.5" rx="6" ry="5.5" fill="#f4d042" opacity="0.20" />
      <rect x="18" y="20" width="1" height="7" fill="#c89a48" />
      <rect x="15" y="23" width="7" height="1" fill="#c89a48" />
      <rect x="16" y="21" width="1" height="1" fill="#9a7232" />
      <rect x="20" y="21" width="1" height="1" fill="#9a7232" />
      <rect x="16" y="25" width="1" height="1" fill="#9a7232" />
      <rect x="20" y="25" width="1" height="1" fill="#9a7232" />
      <rect x="17" y="22" width="3" height="3" fill="#ecc46a" />
      <rect x="18" y="23" width="1" height="1" fill="#fffbe8" />
      <rect x="17" y="22" width="1" height="1" fill="#fff0b8" />

      {/* ── Belt — leather + sun-disc buckle ── */}
      <rect x="11" y="32" width="15" height="3" fill="#150d08" />
      <rect x="12" y="33" width="13" height="2" fill="#33231a" />
      <rect x="12" y="33" width="13" height="1" fill="#4f3722" />
      <rect x="17" y="33" width="3" height="2" fill="#9a7232" />
      <rect x="17" y="33" width="3" height="1" fill="#c89a48" />
      <rect x="18" y="33" width="1" height="1" fill="#fff0b8" />

      {/* ── Tabard skirt (white, gold hem) over steel tassets ── */}
      {/* steel tassets sides */}
      <rect x="11" y="35" width="15" height="5" fill="#150d08" />
      <rect x="12" y="35" width="3" height="4" fill="#4e586a" />
      <rect x="12" y="35" width="1" height="4" fill="#6d7689" />
      <rect x="22" y="35" width="3" height="4" fill="#39424f" />
      <rect x="24" y="35" width="1" height="4" fill="#232c3a" />
      {/* white cloth drop */}
      <rect x="14" y="35" width="9" height="10" fill="#150d08" />
      <rect x="15" y="35" width="7" height="9" fill="#cfc7b2" />
      <rect x="15" y="35" width="2" height="9" fill="#e8e0cc" />
      <rect x="15" y="35" width="1" height="6" fill="#f8f2e2" />
      <rect x="20" y="35" width="2" height="9" fill="#a89e88" />
      <rect x="21" y="35" width="1" height="9" fill="#8a8270" />
      <rect x="18" y="37" width="1" height="7" fill="#a89e88" opacity="0.7" />
      {/* gold hem + crimson stripe above it */}
      <rect x="15" y="42" width="7" height="1" fill="#a93340" />
      <rect x="15" y="43" width="7" height="1" fill="#c89a48" />
      <rect x="15" y="43" width="2" height="1" fill="#ecc46a" />

      {/* ── Right arm — raised radiant longsword ── */}
      <rect x="25" y="19" width="6" height="4" fill="#150d08" />
      <rect x="26" y="20" width="4" height="2" fill="#39424f" />
      <rect x="26" y="20" width="1" height="2" fill="#4e586a" />
      <rect x="27" y="15" width="6" height="6" fill="#150d08" />
      <rect x="28" y="16" width="4" height="4" fill="#4e586a" />
      <rect x="28" y="16" width="1" height="4" fill="#6d7689" />
      <rect x="31" y="16" width="1" height="4" fill="#232c3a" />
      {/* gauntlet fist */}
      <rect x="27" y="11" width="6" height="5" fill="#150d08" />
      <rect x="28" y="12" width="4" height="3" fill="#6d7689" />
      <rect x="28" y="12" width="4" height="1" fill="#939cb0" />
      <rect x="28" y="12" width="1" height="1" fill="#c8cfe0" />
      <rect x="31" y="13" width="1" height="2" fill="#39424f" />
      {/* radiant blade — bright spine + holy tip glow */}
      <ellipse cx="30" cy="1.5" rx="4" ry="3" fill="#fff4c0" opacity="0.30" />
      <rect x="28" y="0" width="4" height="11" fill="#150d08" />
      <rect x="29" y="0" width="1" height="10" fill="#f6f2e0" />
      <rect x="30" y="0" width="1" height="10" fill="#b4ac8e" />
      <rect x="31" y="1" width="1" height="9" fill="#6d7689" />
      <rect x="29" y="0" width="2" height="1" fill="#ffffff" />
      <rect x="29" y="2" width="1" height="2" fill="#ffffff" />
      {/* gold crossguard */}
      <rect x="26" y="10" width="8" height="2" fill="#150d08" />
      <rect x="27" y="10" width="6" height="1" fill="#c89a48" />
      <rect x="27" y="10" width="2" height="1" fill="#ecc46a" />
      <rect x="27" y="10" width="1" height="1" fill="#fff0b8" />
      {/* grip + pommel below the fist */}
      <rect x="29" y="15" width="2" height="3" fill="#150d08" />
      <rect x="29" y="15" width="1" height="2" fill="#4f3722" />
      <rect x="29" y="17" width="2" height="1" fill="#9a7232" />
      <rect x="29" y="17" width="1" height="1" fill="#ecc46a" />

      {/* ── Left arm — gauntlet holding the blazing sun-disc talisman ── */}
      <rect x="6" y="21" width="6" height="4" fill="#150d08" />
      <rect x="7" y="22" width="4" height="2" fill="#6d7689" />
      <rect x="7" y="22" width="4" height="1" fill="#939cb0" />
      <rect x="5" y="24" width="6" height="4" fill="#150d08" />
      <rect x="6" y="25" width="4" height="2" fill="#4e586a" />
      <rect x="6" y="25" width="1" height="2" fill="#6d7689" />
      {/* gauntlet fist */}
      <rect x="5" y="27" width="6" height="4" fill="#150d08" />
      <rect x="6" y="28" width="4" height="2" fill="#6d7689" />
      <rect x="6" y="28" width="4" height="1" fill="#939cb0" />
      <rect x="6" y="28" width="1" height="1" fill="#c8cfe0" />
      {/* chain link */}
      <rect x="7" y="31" width="1" height="1" fill="#c89a48" />
      {/* sun-disc — gold ring, blazing core, ray nubs + bloom */}
      <ellipse cx="7.5" cy="35.5" rx="6" ry="5" fill="#ffe9a8" opacity="0.26" />
      <rect x="4" y="32" width="7" height="7" fill="#150d08" />
      <rect x="5" y="33" width="5" height="5" fill="#c89a48" />
      <rect x="6" y="34" width="3" height="3" fill="#ecc46a" />
      <rect x="7" y="35" width="1" height="1" fill="#fffbe8" />
      <rect x="6" y="34" width="1" height="1" fill="#fff0b8" />
      <rect x="9" y="37" width="1" height="1" fill="#6b4a22" />
      <rect x="7" y="39" width="1" height="1" fill="#c89a48" />
      <rect x="3" y="35" width="1" height="1" fill="#c89a48" />
      <rect x="11" y="35" width="1" height="1" fill="#c89a48" />
      {/* drifting light motes */}
      <rect x="2" y="31" width="1" height="1" fill="#ffd24a" opacity="0.7" />
      <rect x="12" y="32" width="1" height="1" fill="#fff0b8" opacity="0.8" />

      {/* ── Legs — steel greaves, gold knee cops ── */}
      <rect x="11" y="40" width="6" height="14" fill="#150d08" />
      <rect x="12" y="40" width="4" height="3" fill="#4e586a" />
      <rect x="12" y="40" width="1" height="3" fill="#6d7689" />
      <rect x="12" y="43" width="4" height="2" fill="#9a7232" />
      <rect x="12" y="43" width="2" height="1" fill="#c89a48" />
      <rect x="12" y="43" width="1" height="1" fill="#ecc46a" />
      <rect x="12" y="45" width="4" height="8" fill="#4e586a" />
      <rect x="12" y="45" width="1" height="8" fill="#939cb0" />
      <rect x="13" y="45" width="1" height="8" fill="#6d7689" />
      <rect x="15" y="45" width="1" height="8" fill="#232c3a" />
      <rect x="12" y="45" width="1" height="2" fill="#c8cfe0" />
      <rect x="20" y="40" width="6" height="14" fill="#150d08" />
      <rect x="21" y="40" width="4" height="3" fill="#39424f" />
      <rect x="21" y="40" width="1" height="3" fill="#4e586a" />
      <rect x="21" y="43" width="4" height="2" fill="#6b4a22" />
      <rect x="21" y="43" width="2" height="1" fill="#9a7232" />
      <rect x="21" y="45" width="4" height="8" fill="#39424f" />
      <rect x="21" y="45" width="1" height="8" fill="#6d7689" />
      <rect x="24" y="45" width="1" height="8" fill="#161b24" />
      <rect x="24" y="47" width="1" height="3" fill="#2e4a4e" opacity="0.7" />

      {/* ── Sabatons ── */}
      <rect x="9" y="53" width="9" height="5" fill="#150d08" />
      <rect x="10" y="54" width="7" height="3" fill="#232c3a" />
      <rect x="10" y="54" width="7" height="1" fill="#39424f" />
      <rect x="10" y="54" width="3" height="1" fill="#4e586a" />
      <rect x="10" y="56" width="7" height="1" fill="#161b24" />
      <rect x="10" y="55" width="2" height="1" fill="#939cb0" />
      <rect x="10" y="55" width="1" height="1" fill="#c8cfe0" />
      <rect x="19" y="53" width="9" height="5" fill="#150d08" />
      <rect x="20" y="54" width="7" height="3" fill="#232c3a" />
      <rect x="20" y="54" width="7" height="1" fill="#39424f" />
      <rect x="20" y="56" width="7" height="1" fill="#161b24" />
      <rect x="25" y="55" width="2" height="1" fill="#54596a" />
    </svg>
  );
}

