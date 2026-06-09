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
    case 'fighter':
    default:
      return <FighterSvg className={className} />;
  }
}

function BardSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 40"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="Bard"
    >
      {/* Backlight — warm footlight amber + a cool violet stage rim */}
      <ellipse cx="11" cy="17" rx="13" ry="18" fill="#e8a020" opacity="0.10" />
      <ellipse cx="15" cy="15" rx="10" ry="14" fill="#7a5db8" opacity="0.07" />
      <ellipse cx="11" cy="13" rx="8" ry="11" fill="#f4b43a" opacity="0.06" />
      {/* Ground-contact shadow */}
      <ellipse cx="12" cy="39" rx="9" ry="1.6" fill="#000" opacity="0.45" />

      {/* Feathered cap — wine-red ramp with a jaunty cant + plume */}
      <rect x="7" y="3" width="9" height="2" fill="#7a1c2a" />
      <rect x="7" y="3" width="9" height="1" fill="#a8324a" />
      <rect x="7" y="3" width="3" height="1" fill="#c84a64" />
      <rect x="6" y="2" width="5" height="1" fill="#5a1220" />
      <rect x="14" y="2" width="3" height="2" fill="#5a1220" />
      <rect x="6" y="4" width="11" height="1" fill="#4a0e1a" />
      {/* Cap band + gold pin specular */}
      <rect x="7" y="4" width="9" height="1" fill="#3a0a14" />
      <rect x="9" y="3" width="1" height="1" fill="#f4d042" />
      {/* Plume — teal feather sweeping up-right, lit tip */}
      <rect x="16" y="1" width="1" height="3" fill="#2e6a62" />
      <rect x="17" y="0" width="1" height="2" fill="#3a8a7a" />
      <rect x="18" y="0" width="1" height="1" fill="#6ac4b0" />
      <rect x="17" y="0" width="1" height="1" fill="#a8f0dc" />

      {/* Face — fair, ramped */}
      <rect x="8" y="5" width="8" height="4" fill="#d8b888" />
      <rect x="8" y="5" width="1" height="4" fill="#a8824e" />
      <rect x="9" y="5" width="6" height="1" fill="#ecd0a0" />
      <rect x="9" y="5" width="3" height="1" fill="#f8e6c0" />
      <rect x="15" y="6" width="1" height="3" fill="#9c7448" />
      {/* Bright, quick eyes + violet glint */}
      <rect x="9" y="6" width="2" height="1" fill="#241810" />
      <rect x="13" y="6" width="2" height="1" fill="#241810" />
      <rect x="10" y="6" width="1" height="1" fill="#c4b0f0" />
      <rect x="14" y="6" width="1" height="1" fill="#c4b0f0" />
      {/* A half-grin */}
      <rect x="10" y="8" width="4" height="1" fill="#a8824e" />
      <rect x="13" y="8" width="1" height="1" fill="#c84a64" opacity="0.5" />
      {/* Locks at the jaw */}
      <rect x="7" y="5" width="1" height="4" fill="#6a3a1a" />
      <rect x="16" y="5" width="1" height="4" fill="#5a3018" />

      {/* Collar — violet doublet with a lace ruff */}
      <rect x="6" y="9" width="12" height="1" fill="#e8dcc4" />
      <rect x="6" y="10" width="12" height="2" fill="#3a2a5a" />
      <rect x="6" y="10" width="12" height="1" fill="#503d78" />
      <rect x="6" y="10" width="2" height="2" fill="#221640" />
      <rect x="16" y="10" width="2" height="2" fill="#221640" />
      {/* Doublet body — violet ramp + center light, slashed sleeves */}
      <rect x="6" y="12" width="12" height="9" fill="#3a2a5a" />
      <rect x="6" y="12" width="1" height="9" fill="#221640" />
      <rect x="7" y="12" width="1" height="9" fill="#2f2150" />
      <rect x="17" y="12" width="1" height="9" fill="#1c1236" />
      <rect x="11" y="12" width="2" height="9" fill="#4d3a78" />
      <rect x="11" y="12" width="1" height="4" fill="#5a4488" />
      {/* Motley slashes — wine + gold accents */}
      <rect x="8" y="13" width="1" height="3" fill="#7a1c2a" />
      <rect x="14" y="14" width="1" height="3" fill="#7a1c2a" />
      <rect x="9" y="17" width="1" height="1" fill="#d4b062" />
      <rect x="13" y="15" width="1" height="1" fill="#d4b062" />
      {/* Sash + buckle gleam */}
      <rect x="6" y="19" width="12" height="2" fill="#5a1220" />
      <rect x="6" y="19" width="12" height="1" fill="#7a1c2a" />
      <rect x="11" y="19" width="2" height="2" fill="#d4b062" />
      <rect x="11" y="19" width="1" height="1" fill="#fff4c0" />

      {/* Left arm — fretting the neck of the lute high */}
      <rect x="6" y="13" width="2" height="2" fill="#3a2a5a" />
      <rect x="4" y="11" width="2" height="4" fill="#3a2a5a" />
      <rect x="4" y="11" width="1" height="4" fill="#221640" />
      <rect x="4" y="9" width="2" height="2" fill="#d8b888" />
      <rect x="4" y="9" width="2" height="1" fill="#ecd0a0" />
      {/* Right arm — strumming low across the body */}
      <rect x="16" y="13" width="2" height="2" fill="#3a2a5a" />
      <rect x="16" y="15" width="3" height="2" fill="#3a2a5a" />
      <rect x="16" y="15" width="3" height="1" fill="#4d3a78" />
      <rect x="13" y="16" width="2" height="2" fill="#d8b888" />
      <rect x="13" y="16" width="2" height="1" fill="#ecd0a0" />

      {/* War Lute — slung across the torso, warm wood ramp + bright soundboard */}
      {/* Neck rising to the left hand, with frets */}
      <rect x="5" y="9" width="2" height="7" fill="#6a3a1a" />
      <rect x="5" y="9" width="1" height="7" fill="#8c5226" />
      <rect x="6" y="9" width="1" height="7" fill="#4a2810" />
      <rect x="5" y="11" width="2" height="1" fill="#d4b062" />
      <rect x="5" y="13" width="2" height="1" fill="#d4b062" />
      {/* Rounded body / soundboard */}
      <rect x="9" y="15" width="8" height="6" fill="#8c5226" />
      <rect x="9" y="15" width="8" height="1" fill="#b07434" />
      <rect x="9" y="15" width="1" height="6" fill="#6a3a1a" />
      <rect x="16" y="15" width="1" height="6" fill="#4a2810" />
      <rect x="10" y="16" width="5" height="4" fill="#a8682e" />
      <rect x="10" y="16" width="3" height="1" fill="#c89048" />
      {/* Soundhole — dark rosette + gold ring */}
      <rect x="12" y="17" width="2" height="2" fill="#1a0e06" />
      <rect x="11" y="17" width="1" height="2" fill="#d4b062" />
      <rect x="14" y="17" width="1" height="2" fill="#d4b062" />
      {/* Strings catching the footlight */}
      <rect x="7" y="14" width="8" height="1" fill="#e8dcc4" opacity="0.7" />
      <rect x="9" y="20" width="6" height="1" fill="#cdbfa2" opacity="0.6" />
      {/* A struck-chord shimmer — violet bloom + spark */}
      <ellipse cx="13" cy="18" rx="5" ry="4" fill="#a48ee0" opacity="0.16" />
      <rect x="16" y="13" width="1" height="1" fill="#d4c4f8" />
      <rect x="8" y="21" width="1" height="1" fill="#c4b0f0" />

      {/* Doublet skirt / tassets — violet ramp + gold hem */}
      <rect x="6" y="21" width="12" height="4" fill="#3a2a5a" />
      <rect x="6" y="21" width="1" height="4" fill="#221640" />
      <rect x="17" y="21" width="1" height="4" fill="#1c1236" />
      <rect x="11" y="21" width="2" height="4" fill="#4d3a78" />
      <rect x="6" y="24" width="12" height="1" fill="#d4b062" />
      <rect x="6" y="24" width="6" height="1" fill="#f4d042" opacity="0.5" />

      {/* Legs — particoloured hose (one wine, one violet) */}
      <rect x="8" y="25" width="3" height="9" fill="#7a1c2a" />
      <rect x="8" y="25" width="1" height="9" fill="#5a1220" />
      <rect x="10" y="25" width="1" height="9" fill="#a8324a" />
      <rect x="13" y="25" width="3" height="9" fill="#3a2a5a" />
      <rect x="13" y="25" width="1" height="9" fill="#221640" />
      <rect x="15" y="25" width="1" height="9" fill="#4d3a78" />
      {/* Garter ribbons */}
      <rect x="8" y="29" width="3" height="1" fill="#d4b062" />
      <rect x="13" y="29" width="3" height="1" fill="#d4b062" />
      {/* Soft pointed boots */}
      <rect x="7" y="34" width="5" height="4" fill="#3a2418" />
      <rect x="7" y="34" width="5" height="1" fill="#5a3a20" />
      <rect x="7" y="38" width="5" height="1" fill="#1a1410" />
      <rect x="12" y="34" width="5" height="4" fill="#3a2418" />
      <rect x="12" y="34" width="5" height="1" fill="#5a3a20" />
      <rect x="12" y="38" width="5" height="1" fill="#1a1410" />
    </svg>
  );
}

function MonkSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 40"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="Monk"
    >
      {/* Backlight — warm saffron key + cool counter-rim */}
      <ellipse cx="11" cy="17" rx="13" ry="18" fill="#c87a2a" opacity="0.10" />
      <ellipse cx="15" cy="15" rx="10" ry="15" fill="#3a6a72" opacity="0.06" />
      <ellipse cx="11" cy="13" rx="8" ry="11" fill="#e8a020" opacity="0.06" />
      {/* Ground-contact shadow */}
      <ellipse cx="12" cy="39" rx="9" ry="1.6" fill="#000" opacity="0.45" />

      {/* Shaved scalp — skin ramp with a lit crown */}
      <rect x="9" y="1" width="6" height="2" fill="#a07c50" />
      <rect x="9" y="1" width="6" height="1" fill="#c2a47e" />
      <rect x="10" y="0" width="4" height="1" fill="#dcc298" />
      <rect x="10" y="0" width="1" height="1" fill="#f0dcb0" />
      <rect x="8" y="2" width="1" height="2" fill="#8a6a44" />
      <rect x="15" y="2" width="1" height="2" fill="#6f5236" />
      {/* Face — weathered, ramped */}
      <rect x="8" y="3" width="8" height="5" fill="#c2a47e" />
      <rect x="8" y="3" width="1" height="5" fill="#8a6a44" />
      <rect x="9" y="3" width="6" height="1" fill="#dcc298" />
      <rect x="9" y="3" width="3" height="1" fill="#ecd8ae" />
      <rect x="15" y="4" width="1" height="4" fill="#9c7c54" />
      {/* Calm, focused eyes + amber glint */}
      <rect x="9" y="5" width="2" height="1" fill="#3a2a18" />
      <rect x="13" y="5" width="2" height="1" fill="#3a2a18" />
      <rect x="10" y="5" width="1" height="1" fill="#f4b43a" />
      <rect x="14" y="5" width="1" height="1" fill="#f4b43a" />
      {/* Jaw shadow */}
      <rect x="9" y="8" width="6" height="1" fill="#9c7c54" />
      {/* Forehead ash mark */}
      <rect x="11" y="3" width="2" height="1" fill="#5a4630" opacity="0.6" />

      {/* Bare shoulders — skin ramp + lit deltoid */}
      <rect x="5" y="9" width="14" height="2" fill="#c2a47e" />
      <rect x="5" y="9" width="14" height="1" fill="#dcc298" />
      <rect x="6" y="9" width="3" height="1" fill="#ecd8ae" />
      <rect x="5" y="9" width="2" height="2" fill="#9c7c54" />
      <rect x="17" y="9" width="2" height="2" fill="#7f6040" />
      {/* Bare chest — skin ramp + deeper ab/pec shading */}
      <rect x="6" y="11" width="12" height="7" fill="#c2a47e" />
      <rect x="6" y="11" width="1" height="7" fill="#9c7c54" />
      <rect x="17" y="11" width="1" height="7" fill="#7f6040" />
      <rect x="7" y="11" width="3" height="2" fill="#dcc298" />
      <rect x="7" y="11" width="2" height="1" fill="#ecd8ae" />
      <rect x="11" y="12" width="1" height="6" fill="#9c7c54" />
      <rect x="8" y="14" width="2" height="1" fill="#a88858" />
      <rect x="14" y="14" width="2" height="1" fill="#9c7c54" />
      <rect x="8" y="16" width="2" height="1" fill="#a88858" />
      <rect x="14" y="16" width="2" height="1" fill="#9c7c54" />
      {/* Saffron sash across the chest — orange ramp + specular fold */}
      <rect x="5" y="11" width="3" height="8" fill="#c25a1a" />
      <rect x="6" y="12" width="3" height="7" fill="#e07820" />
      <rect x="6" y="12" width="1" height="6" fill="#f49a3a" />
      <rect x="7" y="13" width="1" height="1" fill="#ffc878" />
      {/* Knotted belt — deep saffron */}
      <rect x="6" y="18" width="12" height="2" fill="#a84818" />
      <rect x="6" y="18" width="12" height="1" fill="#c25a1a" />
      <rect x="6" y="18" width="6" height="1" fill="#e07820" opacity="0.6" />
      <rect x="11" y="18" width="2" height="2" fill="#6f2c0c" />

      {/* Right arm — raised in a guarding fist */}
      <rect x="18" y="10" width="2" height="2" fill="#c2a47e" />
      <rect x="19" y="8" width="2" height="3" fill="#c2a47e" />
      <rect x="19" y="8" width="1" height="3" fill="#9c7c54" />
      {/* Wrist wrap */}
      <rect x="19" y="7" width="2" height="2" fill="#d8c098" />
      <rect x="19" y="7" width="2" height="1" fill="#ece0c0" />
      {/* Raised fist + knuckle specular */}
      <rect x="19" y="5" width="3" height="2" fill="#c2a47e" />
      <rect x="19" y="5" width="3" height="1" fill="#dcc298" />
      <rect x="19" y="5" width="1" height="1" fill="#ecd8ae" />
      <rect x="21" y="5" width="1" height="2" fill="#9c7c54" />

      {/* Left arm — drawn back, coiled fist at the hip */}
      <rect x="4" y="11" width="2" height="2" fill="#c2a47e" />
      <rect x="3" y="13" width="2" height="5" fill="#c2a47e" />
      <rect x="3" y="13" width="1" height="5" fill="#9c7c54" />
      {/* Wrist wrap + coiled fist */}
      <rect x="3" y="17" width="2" height="1" fill="#d8c098" />
      <rect x="2" y="18" width="3" height="2" fill="#c2a47e" />
      <rect x="2" y="18" width="3" height="1" fill="#dcc298" />
      <rect x="2" y="18" width="1" height="2" fill="#9c7c54" />

      {/* Saffron wrap skirt — orange ramp + center light + dither */}
      <rect x="6" y="20" width="12" height="9" fill="#c25a1a" />
      <rect x="6" y="20" width="1" height="9" fill="#7f3210" />
      <rect x="7" y="20" width="1" height="9" fill="#a84818" />
      <rect x="17" y="20" width="1" height="9" fill="#7f3210" />
      <rect x="11" y="20" width="2" height="9" fill="#e07820" />
      <rect x="11" y="20" width="1" height="3" fill="#f49a3a" />
      <rect x="9" y="24" width="1" height="1" fill="#e07820" />
      <rect x="14" y="26" width="1" height="1" fill="#7f3210" />
      <rect x="10" y="27" width="1" height="1" fill="#a84818" />
      {/* Hem */}
      <rect x="6" y="29" width="12" height="1" fill="#6f2c0c" />

      {/* Legs — bare, wide stance; skin ramp */}
      <rect x="7" y="30" width="3" height="4" fill="#c2a47e" />
      <rect x="7" y="30" width="1" height="4" fill="#9c7c54" />
      <rect x="9" y="30" width="1" height="4" fill="#a88858" />
      <rect x="14" y="30" width="3" height="4" fill="#c2a47e" />
      <rect x="14" y="30" width="1" height="4" fill="#9c7c54" />
      {/* Ankle wraps */}
      <rect x="7" y="33" width="3" height="1" fill="#d8c098" />
      <rect x="14" y="33" width="3" height="1" fill="#d8c098" />
      {/* Bare feet, planted */}
      <rect x="6" y="34" width="5" height="4" fill="#a07c50" />
      <rect x="6" y="34" width="5" height="1" fill="#c2a47e" />
      <rect x="6" y="38" width="5" height="1" fill="#5a3f24" />
      <rect x="13" y="34" width="5" height="4" fill="#a07c50" />
      <rect x="13" y="34" width="5" height="1" fill="#c2a47e" />
      <rect x="13" y="38" width="5" height="1" fill="#5a3f24" />
    </svg>
  );
}

function DruidSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 40"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="Druid"
    >
      {/* Backlight — warm-green grove haze + amber key */}
      <ellipse cx="11" cy="17" rx="13" ry="18" fill="#5a8a3a" opacity="0.09" />
      <ellipse cx="15" cy="15" rx="10" ry="14" fill="#3a6a72" opacity="0.05" />
      <ellipse cx="11" cy="13" rx="8" ry="11" fill="#e8a020" opacity="0.06" />
      {/* Ground-contact shadow */}
      <ellipse cx="12" cy="39" rx="9" ry="1.6" fill="#000" opacity="0.45" />

      {/* Antlered crown — wood ramp with a lit edge + specular tip */}
      <rect x="6" y="1" width="1" height="2" fill="#5a3f24" />
      <rect x="5" y="0" width="1" height="2" fill="#7a5a36" />
      <rect x="5" y="0" width="1" height="1" fill="#b89058" />
      <rect x="7" y="2" width="1" height="1" fill="#8c6a40" />
      <rect x="17" y="1" width="1" height="2" fill="#5a3f24" />
      <rect x="18" y="0" width="1" height="2" fill="#7a5a36" />
      <rect x="18" y="0" width="1" height="1" fill="#a8814a" />
      <rect x="16" y="2" width="1" height="1" fill="#8c6a40" />

      {/* Leaf-and-bark hood — green ramp */}
      <rect x="9" y="2" width="6" height="1" fill="#223818" />
      <rect x="8" y="3" width="8" height="2" fill="#2e4327" />
      <rect x="8" y="3" width="8" height="1" fill="#345029" />
      <rect x="7" y="4" width="1" height="4" fill="#16240e" />
      <rect x="16" y="4" width="1" height="4" fill="#16240e" />
      {/* Hood rim catch-light (upper-left) + dither */}
      <rect x="8" y="3" width="4" height="1" fill="#4a6b3a" />
      <rect x="8" y="3" width="2" height="1" fill="#5a8a3a" />
      <rect x="8" y="4" width="1" height="1" fill="#4a6b3a" />
      <rect x="10" y="4" width="1" height="1" fill="#3a5a2c" />

      {/* Face in the hood shadow — weathered, ramped */}
      <rect x="8" y="5" width="8" height="4" fill="#c2a47e" />
      <rect x="8" y="5" width="1" height="4" fill="#8a6a44" />
      <rect x="9" y="5" width="6" height="1" fill="#d8bd92" />
      <rect x="15" y="6" width="1" height="3" fill="#9c7c54" />
      {/* Brow occlusion */}
      <rect x="9" y="5" width="6" height="1" fill="#a07c50" opacity="0.5" />
      {/* Calm green eyes with a glint */}
      <rect x="9" y="6" width="2" height="1" fill="#2f5a28" />
      <rect x="13" y="6" width="2" height="1" fill="#2f5a28" />
      <rect x="10" y="6" width="1" height="1" fill="#8ac858" />
      <rect x="14" y="6" width="1" height="1" fill="#8ac858" />
      {/* Grey-green beard / moss — ramped */}
      <rect x="8" y="9" width="8" height="3" fill="#6b785a" />
      <rect x="9" y="9" width="6" height="1" fill="#9caa84" />
      <rect x="9" y="9" width="3" height="1" fill="#b4c09a" />
      <rect x="9" y="10" width="6" height="2" fill="#7d8a6a" />
      <rect x="10" y="11" width="4" height="1" fill="#5a6a4a" />
      <rect x="11" y="12" width="2" height="1" fill="#6b785a" />

      {/* Mantle of leaves over the shoulders */}
      <rect x="5" y="12" width="14" height="2" fill="#2e4a22" />
      <rect x="5" y="12" width="14" height="1" fill="#3a5a2c" />
      <rect x="5" y="12" width="2" height="3" fill="#16240e" />
      <rect x="17" y="12" width="2" height="3" fill="#16240e" />
      <rect x="7" y="12" width="2" height="1" fill="#5a8a3a" />
      <rect x="7" y="12" width="1" height="1" fill="#7aa84a" />
      <rect x="13" y="12" width="2" height="1" fill="#4a6b3a" />

      {/* Earth-brown robe body — ramp + center light */}
      <rect x="6" y="14" width="12" height="14" fill="#4a3a26" />
      <rect x="6" y="14" width="1" height="14" fill="#241a10" />
      <rect x="7" y="14" width="1" height="14" fill="#33271a" />
      <rect x="17" y="14" width="1" height="14" fill="#241a10" />
      <rect x="11" y="14" width="2" height="14" fill="#5e4a32" />
      <rect x="11" y="14" width="1" height="4" fill="#6f593c" />
      {/* Robe dither texture */}
      <rect x="9" y="20" width="1" height="1" fill="#5a4630" />
      <rect x="14" y="22" width="1" height="1" fill="#33271a" />
      <rect x="10" y="24" width="1" height="1" fill="#5a4630" />
      <rect x="13" y="25" width="1" height="1" fill="#33271a" />

      {/* Green sash / vine wrap */}
      <rect x="6" y="18" width="12" height="1" fill="#2e4a22" />
      <rect x="6" y="18" width="12" height="1" fill="#3a5a2c" opacity="0.7" />
      <rect x="9" y="19" width="6" height="1" fill="#4a6b3a" />
      {/* Stitched leaf motif on the chest */}
      <rect x="11" y="15" width="2" height="3" fill="#3a5a2c" />
      <rect x="10" y="16" width="4" height="1" fill="#3a5a2c" />
      <rect x="11" y="15" width="1" height="1" fill="#5a8a3a" />

      {/* Left arm cradled across the body */}
      <rect x="6" y="15" width="2" height="2" fill="#4a3a26" />
      <rect x="5" y="17" width="2" height="5" fill="#4a3a26" />
      <rect x="5" y="17" width="1" height="5" fill="#33271a" />
      <rect x="6" y="22" width="2" height="1" fill="#c2a47e" />
      {/* Right arm holding the gnarled staff */}
      <rect x="16" y="15" width="2" height="2" fill="#4a3a26" />
      <rect x="17" y="17" width="2" height="6" fill="#4a3a26" />
      <rect x="17" y="17" width="1" height="6" fill="#5e4a32" />
      <rect x="18" y="22" width="2" height="2" fill="#c2a47e" />
      <rect x="18" y="22" width="2" height="1" fill="#d8bd92" />

      {/* Gnarled wooden staff — wood ramp */}
      <rect x="20" y="3" width="2" height="31" fill="#5a3f24" />
      <rect x="20" y="3" width="1" height="31" fill="#7a5a36" />
      <rect x="21" y="3" width="1" height="31" fill="#3a2418" />
      <rect x="20" y="13" width="2" height="1" fill="#2a1810" />
      <rect x="20" y="23" width="2" height="1" fill="#2a1810" />
      {/* Living sprig bound at the staff-head — glowing bloom + bright core */}
      <ellipse cx="21" cy="1" rx="5" ry="4" fill="#7aa84a" opacity="0.22" />
      <ellipse cx="21" cy="1" rx="3" ry="2.5" fill="#a8d050" opacity="0.22" />
      <rect x="19" y="1" width="1" height="2" fill="#4a6b3a" />
      <rect x="20" y="0" width="2" height="2" fill="#5a8a3a" />
      <rect x="22" y="1" width="1" height="2" fill="#4a6b3a" />
      <rect x="20" y="0" width="2" height="1" fill="#c0e860" />
      <rect x="20" y="0" width="1" height="1" fill="#e8ffb0" />
      <rect x="20" y="2" width="2" height="1" fill="#7aa84a" />

      {/* Robe lower hem */}
      <rect x="6" y="28" width="12" height="2" fill="#241a10" />
      <rect x="6" y="28" width="12" height="1" fill="#33271a" />
      {/* Legs */}
      <rect x="8" y="30" width="3" height="4" fill="#3a2e22" />
      <rect x="8" y="30" width="1" height="4" fill="#2a2018" />
      <rect x="13" y="30" width="3" height="4" fill="#3a2e22" />
      <rect x="13" y="30" width="1" height="4" fill="#2a2018" />
      {/* Bare, earth-stained feet */}
      <rect x="7" y="34" width="5" height="4" fill="#9c7c54" />
      <rect x="7" y="34" width="5" height="1" fill="#b08a5e" />
      <rect x="7" y="38" width="5" height="1" fill="#5a3f24" />
      <rect x="12" y="34" width="5" height="4" fill="#9c7c54" />
      <rect x="12" y="34" width="5" height="1" fill="#b08a5e" />
      <rect x="12" y="38" width="5" height="1" fill="#5a3f24" />
    </svg>
  );
}

function FighterSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 40"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="Fighter"
    >
      {/* Backlight — warm torch key crossed with a cool steel rim */}
      <ellipse cx="11" cy="16" rx="13" ry="18" fill="#e8a020" opacity="0.10" />
      <ellipse cx="15" cy="15" rx="11" ry="16" fill="#4a6a90" opacity="0.07" />
      <ellipse cx="11" cy="12" rx="8" ry="11" fill="#ffb040" opacity="0.06" />
      {/* Ground-contact shadow */}
      <ellipse cx="12" cy="39" rx="9" ry="1.6" fill="#000" opacity="0.45" />

      {/* Plume / crest — gold ramp + spark */}
      <rect x="11" y="0" width="2" height="1" fill="#f4d042" />
      <rect x="11" y="0" width="1" height="1" fill="#fff4c0" />
      {/* Helmet crown — brass ramp, lit left, specular */}
      <rect x="8" y="1" width="8" height="1" fill="#a8814a" />
      <rect x="8" y="2" width="8" height="5" fill="#8c6232" />
      <rect x="8" y="2" width="2" height="5" fill="#a8814a" />
      <rect x="8" y="2" width="1" height="4" fill="#c89a5a" />
      <rect x="9" y="2" width="1" height="1" fill="#e4c878" />
      <rect x="14" y="2" width="2" height="5" fill="#5a3f24" />
      <rect x="7" y="3" width="1" height="5" fill="#3a2616" />
      <rect x="16" y="3" width="1" height="5" fill="#3a2616" />
      {/* Cool rim down the helmet's lit-away edge */}
      <rect x="15" y="2" width="1" height="3" fill="#6a7a94" opacity="0.5" />
      {/* Visor slit + amber eye-fire + glow */}
      <rect x="9" y="4" width="6" height="2" fill="#100a06" />
      <rect x="10" y="4" width="1" height="1" fill="#ffb648" />
      <rect x="13" y="4" width="1" height="1" fill="#ffb648" />
      <rect x="10" y="4" width="1" height="1" fill="#ffe0a0" opacity="0.8" />
      {/* Cheek / jaw plates */}
      <rect x="8" y="7" width="8" height="2" fill="#6b4a2e" />
      <rect x="8" y="7" width="8" height="1" fill="#8c6232" />
      <rect x="8" y="7" width="2" height="1" fill="#a8814a" />
      <rect x="9" y="8" width="6" height="1" fill="#4a3216" />
      {/* Neck */}
      <rect x="10" y="9" width="4" height="1" fill="#241a10" />

      {/* Pauldrons — brass dome ramp + specular + cool rim */}
      <rect x="5" y="10" width="14" height="2" fill="#8c6232" />
      <rect x="5" y="10" width="14" height="1" fill="#a8814a" />
      <rect x="5" y="10" width="3" height="2" fill="#6b4a2e" />
      <rect x="16" y="10" width="3" height="2" fill="#5a3f24" />
      <rect x="6" y="10" width="3" height="1" fill="#d4b062" />
      <rect x="7" y="10" width="1" height="1" fill="#f4e0a0" />
      <rect x="18" y="10" width="1" height="2" fill="#6a7a94" opacity="0.55" />
      {/* Chest plate — cool steel ramp, lit dome, specular */}
      <rect x="7" y="12" width="10" height="9" fill="#3e4654" />
      <rect x="6" y="12" width="1" height="9" fill="#2a313e" />
      <rect x="7" y="12" width="1" height="9" fill="#565d6e" />
      <rect x="17" y="12" width="1" height="9" fill="#20252f" />
      <rect x="8" y="12" width="3" height="3" fill="#6a7080" />
      <rect x="8" y="12" width="2" height="2" fill="#8a91a4" />
      <rect x="9" y="12" width="1" height="1" fill="#cdd6e6" />
      {/* Chestplate dither down the shaded side */}
      <rect x="15" y="14" width="1" height="1" fill="#20252f" />
      <rect x="14" y="16" width="1" height="1" fill="#2a313e" />
      <rect x="15" y="18" width="1" height="1" fill="#20252f" />
      {/* Glowing gold emblem — bloom + bright core */}
      <ellipse cx="12" cy="16" rx="4" ry="4" fill="#f4d042" opacity="0.18" />
      <rect x="11" y="14" width="2" height="5" fill="#d4b062" />
      <rect x="10" y="15" width="4" height="2" fill="#d4b062" />
      <rect x="11" y="14" width="1" height="3" fill="#f4d042" />
      <rect x="11" y="15" width="1" height="1" fill="#fff4c0" />
      {/* Belt */}
      <rect x="6" y="21" width="12" height="1" fill="#100a06" />
      <rect x="11" y="21" width="2" height="1" fill="#d4b062" />
      <rect x="11" y="21" width="1" height="1" fill="#f4d042" />

      {/* Right arm holding sword */}
      <rect x="18" y="11" width="2" height="2" fill="#8c6232" />
      <rect x="18" y="11" width="2" height="1" fill="#a8814a" />
      <rect x="18" y="13" width="2" height="6" fill="#3a2e22" />
      <rect x="18" y="13" width="1" height="6" fill="#5a4030" />
      <rect x="18" y="19" width="3" height="2" fill="#3a2e22" />
      {/* Longsword — steel ramp, bright spine, specular */}
      <rect x="19" y="2" width="2" height="13" fill="#8a91a4" />
      <rect x="19" y="2" width="1" height="13" fill="#e8eef8" />
      <rect x="20" y="2" width="1" height="13" fill="#6a7080" />
      <rect x="19" y="3" width="1" height="2" fill="#ffffff" />
      <rect x="19" y="8" width="1" height="1" fill="#ffffff" opacity="0.7" />
      <rect x="18" y="15" width="4" height="1" fill="#a8814a" />
      <rect x="18" y="15" width="4" height="1" fill="#d4b062" opacity="0.5" />
      <rect x="19" y="16" width="2" height="3" fill="#3a2e22" />
      <rect x="19" y="16" width="1" height="3" fill="#5a4030" />

      {/* Left arm holding shield */}
      <rect x="4" y="11" width="2" height="2" fill="#8c6232" />
      <rect x="4" y="13" width="2" height="6" fill="#3a2e22" />
      <rect x="3" y="19" width="3" height="2" fill="#3a2e22" />
      {/* Shield — brass ramp, domed boss, gold rivets, specular */}
      <rect x="0" y="11" width="4" height="14" fill="#5a3f24" />
      <rect x="1" y="12" width="2" height="12" fill="#8c6232" />
      <rect x="1" y="12" width="1" height="10" fill="#a8814a" />
      <rect x="1" y="12" width="1" height="2" fill="#d4b062" />
      <rect x="1" y="12" width="1" height="1" fill="#f4e0a0" />
      <rect x="3" y="13" width="1" height="11" fill="#3a2616" />
      <rect x="1" y="15" width="2" height="2" fill="#d4b062" />
      <rect x="1" y="15" width="1" height="1" fill="#fff4c0" />
      <rect x="1" y="20" width="2" height="2" fill="#d4b062" />
      <rect x="1" y="20" width="1" height="1" fill="#fff4c0" />

      {/* Hip / skirt */}
      <rect x="7" y="22" width="10" height="3" fill="#3a2e22" />
      <rect x="7" y="22" width="10" height="1" fill="#5a4030" />
      <rect x="11" y="22" width="2" height="3" fill="#6a5040" />
      {/* Right leg — greave, steel ramp */}
      <rect x="8" y="25" width="3" height="9" fill="#3e4654" />
      <rect x="8" y="25" width="1" height="9" fill="#565d6e" />
      <rect x="10" y="25" width="1" height="9" fill="#20252f" />
      {/* Left leg */}
      <rect x="13" y="25" width="3" height="9" fill="#3e4654" />
      <rect x="13" y="25" width="1" height="9" fill="#565d6e" />
      <rect x="15" y="25" width="1" height="9" fill="#20252f" />
      {/* Sabatons + steel toe-cap glint */}
      <rect x="7" y="34" width="5" height="4" fill="#14110f" />
      <rect x="7" y="34" width="5" height="1" fill="#3a2e22" />
      <rect x="7" y="38" width="5" height="1" fill="#565d6e" />
      <rect x="7" y="37" width="2" height="1" fill="#8a91a4" />
      <rect x="12" y="34" width="5" height="4" fill="#14110f" />
      <rect x="12" y="34" width="5" height="1" fill="#3a2e22" />
      <rect x="12" y="38" width="5" height="1" fill="#565d6e" />
      <rect x="12" y="37" width="2" height="1" fill="#8a91a4" />
    </svg>
  );
}

function RogueSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 40"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="Rogue"
    >
      {/* Backlight — cold teal rim so the assassin reads from the dark */}
      <ellipse cx="11" cy="15" rx="12" ry="17" fill="#1c3a3a" opacity="0.24" />
      <ellipse cx="9" cy="13" rx="9" ry="14" fill="#2e5a52" opacity="0.18" />
      <ellipse cx="12" cy="13" rx="8" ry="11" fill="#3a6a60" opacity="0.09" />
      {/* Ground-contact shadow */}
      <ellipse cx="12" cy="39" rx="9" ry="1.6" fill="#000" opacity="0.45" />

      {/* Hood outline / peak */}
      <rect x="9" y="1" width="6" height="1" fill="#14110f" />
      <rect x="8" y="2" width="8" height="1" fill="#14110f" />
      <rect x="7" y="3" width="10" height="2" fill="#1f1a17" />
      {/* Hood body — near-black ramp */}
      <rect x="6" y="5" width="12" height="6" fill="#2a2420" />
      <rect x="6" y="5" width="1" height="6" fill="#14110f" />
      <rect x="17" y="5" width="1" height="6" fill="#0e0b09" />
      <rect x="7" y="5" width="2" height="4" fill="#3a332c" />
      {/* Hood rim catch-light — cool teal, upper-left (separation) */}
      <rect x="6" y="3" width="5" height="1" fill="#3a564e" />
      <rect x="6" y="4" width="1" height="4" fill="#4a7268" />
      <rect x="7" y="3" width="2" height="1" fill="#6aa090" />
      <rect x="6" y="3" width="1" height="1" fill="#8ac4b4" />
      {/* Hood front fold */}
      <rect x="6" y="10" width="12" height="1" fill="#0e0b09" />
      {/* Face shadow inside hood */}
      <rect x="8" y="6" width="8" height="4" fill="#0a0806" />
      {/* Eye glints — yellow + red core + bloom */}
      <ellipse cx="12" cy="7" rx="4" ry="2" fill="#f4d042" opacity="0.12" />
      <rect x="9" y="7" width="2" height="1" fill="#f4d042" />
      <rect x="13" y="7" width="2" height="1" fill="#f4d042" />
      <rect x="9" y="7" width="1" height="1" fill="#b5302c" />
      <rect x="13" y="7" width="1" height="1" fill="#b5302c" />
      <rect x="10" y="7" width="1" height="1" fill="#fff4a0" />
      {/* Mouth scarf hint */}
      <rect x="9" y="9" width="6" height="1" fill="#3a2e22" />

      {/* Cape over shoulders — teal rim on the lit edge */}
      <rect x="4" y="11" width="16" height="2" fill="#2a2420" />
      <rect x="4" y="11" width="16" height="1" fill="#3a332c" />
      <rect x="4" y="11" width="2" height="3" fill="#14110f" />
      <rect x="18" y="11" width="2" height="3" fill="#0e0b09" />
      <rect x="4" y="11" width="1" height="2" fill="#3a564e" opacity="0.8" />
      {/* Crouched torso — lit left, deep right */}
      <rect x="7" y="13" width="10" height="6" fill="#352c22" />
      <rect x="6" y="13" width="1" height="6" fill="#1a1614" />
      <rect x="17" y="13" width="1" height="6" fill="#100d0b" />
      <rect x="7" y="13" width="2" height="5" fill="#4a3c2c" />
      <rect x="7" y="13" width="1" height="3" fill="#5e4a36" />
      {/* Leather chest straps + buckle gleam */}
      <rect x="8" y="14" width="8" height="1" fill="#6b4a36" />
      <rect x="8" y="17" width="8" height="1" fill="#5a4030" />
      <rect x="11" y="14" width="1" height="1" fill="#a8824e" />
      {/* Belt with pouches */}
      <rect x="6" y="19" width="12" height="2" fill="#14110f" />
      <rect x="9" y="20" width="2" height="2" fill="#5a4030" />
      <rect x="13" y="20" width="2" height="2" fill="#5a4030" />
      <rect x="9" y="20" width="2" height="1" fill="#7a5640" />

      {/* Right arm — down/back holding dagger */}
      <rect x="17" y="13" width="2" height="2" fill="#352c22" />
      <rect x="18" y="14" width="2" height="5" fill="#352c22" />
      <rect x="18" y="14" width="1" height="5" fill="#1a1614" />
      <rect x="19" y="18" width="2" height="3" fill="#c2a47e" />
      <rect x="19" y="18" width="2" height="1" fill="#dcc098" />
      {/* Right dagger (down) — steel ramp, specular + teal underglow */}
      <rect x="20" y="20" width="2" height="1" fill="#6b4a2e" />
      <rect x="20" y="21" width="2" height="4" fill="#8a91a4" />
      <rect x="20" y="21" width="1" height="4" fill="#e8eef8" />
      <rect x="20" y="22" width="1" height="1" fill="#ffffff" />
      <rect x="21" y="21" width="1" height="3" fill="#6aa090" opacity="0.4" />
      <rect x="20" y="25" width="2" height="1" fill="#14110f" />
      {/* Left arm — across body holding dagger */}
      <rect x="5" y="13" width="2" height="2" fill="#352c22" />
      <rect x="4" y="14" width="2" height="5" fill="#352c22" />
      <rect x="4" y="14" width="1" height="5" fill="#1a1614" />
      <rect x="3" y="18" width="2" height="3" fill="#c2a47e" />
      {/* Left dagger (up — reverse grip) + specular */}
      <rect x="2" y="13" width="2" height="1" fill="#14110f" />
      <rect x="2" y="14" width="2" height="4" fill="#8a91a4" />
      <rect x="2" y="14" width="1" height="4" fill="#e8eef8" />
      <rect x="2" y="15" width="1" height="1" fill="#ffffff" />
      <rect x="3" y="14" width="1" height="3" fill="#6aa090" opacity="0.4" />
      <rect x="2" y="18" width="2" height="1" fill="#6b4a2e" />
      {/* Cape ends down the sides */}
      <rect x="3" y="13" width="2" height="10" fill="#14110f" />
      <rect x="3" y="13" width="1" height="6" fill="#241f1c" />
      <rect x="19" y="13" width="2" height="6" fill="#0e0b09" />

      {/* Hip */}
      <rect x="7" y="21" width="10" height="3" fill="#2a2420" />
      <rect x="7" y="21" width="10" height="1" fill="#3a332c" />
      {/* Legs — forward stance */}
      <rect x="8" y="24" width="3" height="6" fill="#2a2420" />
      <rect x="8" y="24" width="1" height="6" fill="#14110f" />
      <rect x="9" y="24" width="1" height="6" fill="#3a332c" />
      <rect x="13" y="24" width="3" height="6" fill="#2a2420" />
      <rect x="13" y="24" width="1" height="6" fill="#14110f" />
      {/* Knee pads */}
      <rect x="8" y="27" width="3" height="1" fill="#5a4030" />
      <rect x="13" y="27" width="3" height="1" fill="#5a4030" />
      {/* Lower legs */}
      <rect x="8" y="30" width="3" height="4" fill="#352c22" />
      <rect x="8" y="30" width="1" height="4" fill="#241f1c" />
      <rect x="13" y="30" width="3" height="4" fill="#352c22" />
      <rect x="13" y="30" width="1" height="4" fill="#241f1c" />
      {/* Boots */}
      <rect x="7" y="34" width="5" height="4" fill="#14110f" />
      <rect x="7" y="34" width="5" height="1" fill="#2a2420" />
      <rect x="7" y="38" width="5" height="1" fill="#3a2e22" />
      <rect x="12" y="34" width="5" height="4" fill="#14110f" />
      <rect x="12" y="34" width="5" height="1" fill="#2a2420" />
      <rect x="12" y="38" width="5" height="1" fill="#3a2e22" />
    </svg>
  );
}

function WizardSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 40"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="Wizard"
    >
      {/* Backlight — arcane violet bloom + amber counter-key */}
      <ellipse cx="11" cy="18" rx="13" ry="19" fill="#7a5db8" opacity="0.12" />
      <ellipse cx="15" cy="15" rx="10" ry="14" fill="#e8a020" opacity="0.05" />
      <ellipse cx="11" cy="14" rx="9" ry="13" fill="#a48ee0" opacity="0.07" />
      {/* Ground-contact shadow */}
      <ellipse cx="12" cy="39" rx="9" ry="1.6" fill="#000" opacity="0.45" />

      {/* Pointed hat — tall, canted; purple ramp */}
      <rect x="11" y="0" width="2" height="1" fill="#3a2a5a" />
      <rect x="10" y="1" width="3" height="1" fill="#3a2a5a" />
      <rect x="9" y="2" width="4" height="1" fill="#3a2a5a" />
      <rect x="9" y="3" width="5" height="1" fill="#3a2a5a" />
      <rect x="8" y="4" width="6" height="1" fill="#3a2a5a" />
      <rect x="8" y="5" width="7" height="1" fill="#3a2a5a" />
      <rect x="7" y="6" width="8" height="1" fill="#3a2a5a" />
      {/* Hat shadow side */}
      <rect x="11" y="2" width="2" height="5" fill="#2a1d48" />
      <rect x="12" y="3" width="2" height="3" fill="#221640" />
      {/* Hat left-slope catch-light */}
      <rect x="9" y="2" width="1" height="1" fill="#5a4488" />
      <rect x="8" y="4" width="1" height="2" fill="#6a52a0" />
      <rect x="7" y="6" width="1" height="1" fill="#8068b8" />
      {/* Hat brim — wide, ramped */}
      <rect x="5" y="7" width="12" height="2" fill="#3a2a5a" />
      <rect x="5" y="7" width="12" height="1" fill="#503d78" />
      <rect x="5" y="7" width="6" height="1" fill="#6a52a0" />
      <rect x="5" y="8" width="12" height="1" fill="#221640" />
      {/* Metal band + glowing sigil */}
      <rect x="8" y="5" width="7" height="1" fill="#2a1d48" />
      <rect x="10" y="5" width="3" height="1" fill="#6a607a" />
      <rect x="11" y="4" width="1" height="1" fill="#c4b0f0" />

      {/* Face (under brim) */}
      <rect x="8" y="9" width="8" height="4" fill="#c8a878" />
      <rect x="8" y="9" width="1" height="4" fill="#9c7c54" />
      <rect x="9" y="9" width="6" height="1" fill="#dcc298" />
      <rect x="15" y="9" width="1" height="4" fill="#9c7c54" />
      {/* Eyes — a cold arcane spark */}
      <rect x="9" y="10" width="2" height="1" fill="#1a1410" />
      <rect x="13" y="10" width="2" height="1" fill="#1a1410" />
      <rect x="9" y="10" width="1" height="1" fill="#9ab0ff" />
      <rect x="13" y="10" width="1" height="1" fill="#9ab0ff" />
      {/* White beard — ramped + lit top */}
      <rect x="8" y="13" width="8" height="3" fill="#cfc4ac" />
      <rect x="8" y="13" width="8" height="1" fill="#ece2cc" />
      <rect x="9" y="13" width="4" height="1" fill="#f8f0dc" />
      <rect x="9" y="14" width="6" height="2" fill="#bcb094" />
      <rect x="10" y="15" width="4" height="2" fill="#e8dcc4" />
      <rect x="11" y="17" width="2" height="1" fill="#cfc4ac" />

      {/* Robe collar */}
      <rect x="6" y="16" width="12" height="2" fill="#2a1d48" />
      <rect x="6" y="16" width="12" height="1" fill="#3a2a5a" />
      {/* Robe body — wide; purple ramp + center light */}
      <rect x="5" y="18" width="14" height="14" fill="#3a2a5a" />
      <rect x="5" y="18" width="2" height="14" fill="#2a1d48" />
      <rect x="5" y="18" width="1" height="14" fill="#221640" />
      <rect x="17" y="18" width="2" height="14" fill="#221640" />
      <rect x="11" y="18" width="2" height="14" fill="#4d3a78" />
      <rect x="11" y="18" width="1" height="5" fill="#5a4488" />
      {/* Robe dither */}
      <rect x="8" y="24" width="1" height="1" fill="#473570" />
      <rect x="15" y="26" width="1" height="1" fill="#2a1d48" />
      <rect x="9" y="28" width="1" height="1" fill="#2a1d48" />
      {/* Robe trim — glowing gold band */}
      <rect x="5" y="31" width="14" height="1" fill="#d4b062" />
      <rect x="5" y="31" width="7" height="1" fill="#f4d042" opacity="0.6" />
      <rect x="8" y="31" width="1" height="1" fill="#fff4c0" />
      {/* Arcane sash — glowing */}
      <rect x="9" y="22" width="6" height="1" fill="#a48ee0" />
      <rect x="10" y="23" width="4" height="1" fill="#a48ee0" />
      <rect x="11" y="24" width="2" height="1" fill="#d4c4f8" />

      {/* Tome cradled in left arm — blood-red ramp */}
      <rect x="2" y="20" width="5" height="6" fill="#5a1208" />
      <rect x="2" y="20" width="5" height="1" fill="#7a2a18" />
      <rect x="2" y="20" width="5" height="1" fill="#9a3a22" opacity="0.6" />
      <rect x="2" y="25" width="5" height="1" fill="#3a0a08" />
      <rect x="2" y="20" width="1" height="6" fill="#3a0a08" />
      {/* Tome gold clasp + specular */}
      <rect x="4" y="22" width="1" height="2" fill="#d4b062" />
      <rect x="3" y="22" width="3" height="1" fill="#d4b062" />
      <rect x="4" y="22" width="1" height="1" fill="#fff4c0" />
      {/* Left arm cradling tome */}
      <rect x="6" y="19" width="2" height="2" fill="#3a2a5a" />
      <rect x="5" y="21" width="2" height="5" fill="#3a2a5a" />
      <rect x="5" y="21" width="1" height="5" fill="#221640" />
      <rect x="6" y="26" width="2" height="1" fill="#c8a878" />
      {/* Right arm holding staff */}
      <rect x="16" y="19" width="2" height="2" fill="#3a2a5a" />
      <rect x="17" y="21" width="2" height="6" fill="#3a2a5a" />
      <rect x="17" y="21" width="1" height="6" fill="#4d3a78" />
      <rect x="18" y="26" width="2" height="2" fill="#c8a878" />

      {/* Staff — wood ramp */}
      <rect x="20" y="2" width="2" height="32" fill="#5a3f24" />
      <rect x="20" y="2" width="1" height="32" fill="#8c6232" />
      <rect x="21" y="2" width="1" height="32" fill="#3a2418" />
      <rect x="20" y="14" width="2" height="1" fill="#2a1810" />
      <rect x="20" y="24" width="2" height="1" fill="#2a1810" />
      {/* Staff crystal orb — layered bloom + bright core specular */}
      <ellipse cx="21" cy="2" rx="6" ry="6" fill="#a48ee0" opacity="0.22" />
      <ellipse cx="21" cy="2" rx="3.5" ry="3.5" fill="#c4b0f0" opacity="0.28" />
      <rect x="19" y="0" width="4" height="1" fill="#c4b0f0" />
      <rect x="18" y="1" width="6" height="3" fill="#a48ee0" />
      <rect x="19" y="0" width="4" height="1" fill="#e8d4ff" />
      <rect x="19" y="2" width="4" height="1" fill="#c4b0f0" />
      <rect x="20" y="1" width="2" height="2" fill="#ffffff" />
      <rect x="18" y="4" width="6" height="1" fill="#7a5db8" />

      {/* Robe lower hem (triangular cuts) */}
      <rect x="5" y="32" width="14" height="2" fill="#221640" />
      <polygon points="5,34 7,32 9,34" fill="#3a2a5a" />
      <polygon points="9,34 11,32 13,34" fill="#3a2a5a" />
      <polygon points="13,34 15,32 17,34" fill="#3a2a5a" />
      <polygon points="9,34 11,32 11,34" fill="#4d3a78" />
      {/* Boots */}
      <rect x="8" y="34" width="3" height="4" fill="#14110f" />
      <rect x="13" y="34" width="3" height="4" fill="#14110f" />
      <rect x="8" y="38" width="3" height="1" fill="#3a2418" />
      <rect x="13" y="38" width="3" height="1" fill="#3a2418" />
    </svg>
  );
}

function BarbarianSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 40"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="Barbarian"
    >
      {/* Backlight — blood-warm rage haze + cool counter-rim */}
      <ellipse cx="11" cy="17" rx="13" ry="18" fill="#b5302c" opacity="0.10" />
      <ellipse cx="15" cy="15" rx="10" ry="14" fill="#4a6a72" opacity="0.05" />
      <ellipse cx="11" cy="13" rx="8" ry="11" fill="#e8a020" opacity="0.06" />
      {/* Ground-contact shadow */}
      <ellipse cx="12" cy="39" rx="9" ry="1.6" fill="#000" opacity="0.45" />

      {/* Wild topknot */}
      <rect x="10" y="0" width="3" height="1" fill="#2a1810" />
      <rect x="11" y="1" width="1" height="1" fill="#5a3a20" />
      {/* Hair / scalp */}
      <rect x="8" y="2" width="8" height="2" fill="#3a2418" />
      <rect x="8" y="2" width="8" height="1" fill="#5a3a20" />
      <rect x="7" y="3" width="1" height="3" fill="#2a1810" />
      <rect x="16" y="3" width="1" height="3" fill="#2a1810" />
      {/* Face — bare, weathered; skin ramp */}
      <rect x="8" y="4" width="8" height="5" fill="#c8a878" />
      <rect x="8" y="4" width="1" height="5" fill="#9c7448" />
      <rect x="9" y="4" width="6" height="1" fill="#e0c49c" />
      <rect x="9" y="4" width="3" height="1" fill="#ecd8ae" />
      <rect x="15" y="4" width="1" height="5" fill="#8a6840" />
      {/* Brow shadow + glaring eyes + ember glint */}
      <rect x="8" y="5" width="8" height="1" fill="#a07c50" opacity="0.7" />
      <rect x="9" y="6" width="2" height="1" fill="#1a1410" />
      <rect x="13" y="6" width="2" height="1" fill="#1a1410" />
      <rect x="10" y="6" width="1" height="1" fill="#f4b43a" />
      <rect x="14" y="6" width="1" height="1" fill="#f4b43a" />
      {/* War paint stripe across the eyes */}
      <rect x="8" y="6" width="1" height="1" fill="#b5302c" />
      <rect x="15" y="6" width="1" height="1" fill="#b5302c" />
      {/* Jaw / beard stubble */}
      <rect x="9" y="9" width="6" height="1" fill="#8c6840" />
      {/* Thick neck */}
      <rect x="10" y="10" width="4" height="1" fill="#a07c50" />

      {/* Massive bare shoulders — ramp + bright deltoid */}
      <rect x="4" y="11" width="16" height="2" fill="#c8a878" />
      <rect x="4" y="11" width="16" height="1" fill="#e0c49c" />
      <rect x="4" y="11" width="2" height="2" fill="#9c7448" />
      <rect x="18" y="11" width="2" height="2" fill="#8a6840" />
      <rect x="6" y="11" width="4" height="1" fill="#f0dcae" />
      {/* Bare chest with war paint; skin ramp + deeper definition */}
      <rect x="6" y="13" width="12" height="7" fill="#c8a878" />
      <rect x="6" y="13" width="1" height="7" fill="#9c7448" />
      <rect x="17" y="13" width="1" height="7" fill="#8a6840" />
      <rect x="7" y="13" width="3" height="2" fill="#e0c49c" />
      <rect x="7" y="13" width="2" height="1" fill="#f0dcae" />
      {/* Pectoral / ab shading */}
      <rect x="11" y="14" width="1" height="6" fill="#9c7448" />
      <rect x="8" y="16" width="3" height="1" fill="#a88858" />
      <rect x="13" y="16" width="3" height="1" fill="#977048" />
      <rect x="9" y="18" width="1" height="1" fill="#a88858" />
      <rect x="14" y="18" width="1" height="1" fill="#977048" />
      {/* Red war-paint chevrons — bright core */}
      <rect x="9" y="14" width="2" height="1" fill="#b5302c" />
      <rect x="13" y="14" width="2" height="1" fill="#b5302c" />
      <rect x="9" y="14" width="1" height="1" fill="#f04438" />
      <rect x="13" y="14" width="1" height="1" fill="#f04438" />
      {/* Fur / hide belt */}
      <rect x="6" y="20" width="12" height="2" fill="#5a3a20" />
      <rect x="6" y="20" width="12" height="1" fill="#7a5230" />
      <rect x="6" y="20" width="5" height="1" fill="#8c6038" opacity="0.7" />
      <rect x="11" y="20" width="2" height="2" fill="#2a1810" />

      {/* Left arm — gripping the haft low */}
      <rect x="4" y="13" width="2" height="2" fill="#c8a878" />
      <rect x="3" y="15" width="2" height="5" fill="#c8a878" />
      <rect x="3" y="15" width="1" height="5" fill="#9c7448" />
      <rect x="3" y="15" width="1" height="2" fill="#dcc098" />
      <rect x="3" y="20" width="3" height="2" fill="#a07c50" />
      {/* Right arm — raised, gripping the haft high */}
      <rect x="18" y="12" width="2" height="2" fill="#c8a878" />
      <rect x="19" y="9" width="2" height="4" fill="#c8a878" />
      <rect x="19" y="9" width="1" height="4" fill="#9c7448" />
      <rect x="19" y="7" width="2" height="2" fill="#a07c50" />

      {/* Greataxe haft — diagonal, wood ramp */}
      <rect x="5" y="19" width="2" height="2" fill="#2a1810" />
      <rect x="7" y="16" width="2" height="3" fill="#5a3a20" />
      <rect x="9" y="13" width="2" height="3" fill="#5a3a20" />
      <rect x="11" y="10" width="2" height="3" fill="#5a3a20" />
      <rect x="13" y="7" width="2" height="3" fill="#5a3a20" />
      <rect x="15" y="5" width="2" height="2" fill="#5a3a20" />
      <rect x="8" y="16" width="1" height="2" fill="#7a5230" />
      <rect x="12" y="10" width="1" height="2" fill="#7a5230" />
      {/* Greataxe head — steel ramp, bright edge + specular */}
      <rect x="14" y="1" width="2" height="5" fill="#6a7080" />
      <rect x="16" y="0" width="4" height="6" fill="#8a91a4" />
      <rect x="17" y="1" width="3" height="4" fill="#b4bcce" />
      <rect x="18" y="1" width="2" height="2" fill="#e8eef8" />
      <rect x="16" y="0" width="1" height="6" fill="#54596a" />
      <rect x="19" y="1" width="1" height="1" fill="#ffffff" />

      {/* Hip / loincloth */}
      <rect x="7" y="22" width="10" height="3" fill="#5a3a20" />
      <rect x="7" y="22" width="10" height="1" fill="#7a5230" />
      <rect x="11" y="22" width="2" height="4" fill="#2a1810" />
      {/* Right leg — skin ramp */}
      <rect x="8" y="25" width="3" height="9" fill="#c8a878" />
      <rect x="8" y="25" width="1" height="9" fill="#9c7448" />
      <rect x="10" y="25" width="1" height="9" fill="#977048" />
      <rect x="8" y="25" width="1" height="3" fill="#dcc098" />
      {/* Left leg */}
      <rect x="13" y="25" width="3" height="9" fill="#c8a878" />
      <rect x="13" y="25" width="1" height="9" fill="#9c7448" />
      <rect x="15" y="25" width="1" height="9" fill="#8a6840" />
      {/* Fur leg-wraps */}
      <rect x="8" y="30" width="3" height="2" fill="#5a3a20" />
      <rect x="8" y="30" width="3" height="1" fill="#7a5230" />
      <rect x="13" y="30" width="3" height="2" fill="#5a3a20" />
      <rect x="13" y="30" width="3" height="1" fill="#7a5230" />
      {/* Crude boots */}
      <rect x="7" y="34" width="5" height="4" fill="#3a2418" />
      <rect x="7" y="34" width="5" height="1" fill="#5a3a20" />
      <rect x="7" y="38" width="5" height="1" fill="#1a1410" />
      <rect x="12" y="34" width="5" height="4" fill="#3a2418" />
      <rect x="12" y="34" width="5" height="1" fill="#5a3a20" />
      <rect x="12" y="38" width="5" height="1" fill="#1a1410" />
    </svg>
  );
}

function RangerSvg({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 40"
      shapeRendering="crispEdges"
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-label="Ranger"
    >
      {/* Backlight — cool forest dusk + warm amber key */}
      <ellipse cx="11" cy="17" rx="12" ry="18" fill="#2e4a22" opacity="0.12" />
      <ellipse cx="15" cy="15" rx="10" ry="14" fill="#4a8278" opacity="0.07" />
      <ellipse cx="11" cy="13" rx="8" ry="11" fill="#e8a020" opacity="0.05" />
      {/* Ground-contact shadow */}
      <ellipse cx="12" cy="39" rx="9" ry="1.6" fill="#000" opacity="0.45" />

      {/* Hood peak — green ramp */}
      <rect x="9" y="1" width="5" height="1" fill="#223818" />
      <rect x="8" y="2" width="7" height="1" fill="#2e4a22" />
      <rect x="8" y="2" width="7" height="1" fill="#345029" opacity="0.6" />
      {/* Hood body */}
      <rect x="7" y="3" width="9" height="5" fill="#345029" />
      <rect x="7" y="3" width="1" height="5" fill="#16240e" />
      <rect x="15" y="3" width="1" height="5" fill="#16240e" />
      <rect x="8" y="3" width="2" height="4" fill="#3f5e30" />
      {/* Hood rim catch-light — lit green upper-left */}
      <rect x="8" y="3" width="3" height="1" fill="#4a6b3a" />
      <rect x="8" y="3" width="2" height="1" fill="#5a8a3a" />
      <rect x="8" y="4" width="1" height="2" fill="#6a9a44" />
      {/* Face in the hood shadow — skin ramp */}
      <rect x="9" y="5" width="6" height="4" fill="#c8a878" />
      <rect x="9" y="5" width="1" height="4" fill="#9c7448" />
      <rect x="10" y="5" width="5" height="1" fill="#e0c49c" />
      <rect x="10" y="5" width="2" height="1" fill="#ecd8ae" />
      {/* Sharp eyes + green glint */}
      <rect x="10" y="6" width="1" height="1" fill="#1a1410" />
      <rect x="13" y="6" width="1" height="1" fill="#3a6a2e" />
      <rect x="13" y="6" width="1" height="1" fill="#7ac84a" />
      {/* Jaw */}
      <rect x="10" y="9" width="4" height="1" fill="#a07c50" />

      {/* Cloak over shoulders */}
      <rect x="5" y="10" width="14" height="2" fill="#2e4a22" />
      <rect x="5" y="10" width="14" height="1" fill="#3a5a2c" />
      <rect x="5" y="10" width="2" height="3" fill="#16240e" />
      <rect x="17" y="10" width="2" height="3" fill="#0f1c08" />
      <rect x="5" y="10" width="3" height="1" fill="#4a6b3a" />
      {/* Leather-jerkin torso — ramp */}
      <rect x="7" y="12" width="10" height="7" fill="#3a2e22" />
      <rect x="6" y="12" width="1" height="7" fill="#2a2018" />
      <rect x="17" y="12" width="1" height="7" fill="#1f1812" />
      <rect x="8" y="12" width="2" height="2" fill="#4f3d2c" />
      {/* Green tunic under the jerkin */}
      <rect x="9" y="13" width="6" height="5" fill="#345029" />
      <rect x="11" y="13" width="1" height="5" fill="#2a3f20" />
      <rect x="10" y="13" width="1" height="4" fill="#456a34" />
      <rect x="10" y="13" width="1" height="1" fill="#5a8a3a" />
      {/* Quiver strap across the chest */}
      <rect x="8" y="13" width="8" height="1" fill="#5a4030" />
      <rect x="9" y="15" width="7" height="1" fill="#5a4030" />
      {/* Quiver of arrows over the shoulder */}
      <rect x="3" y="9" width="3" height="6" fill="#5a4030" />
      <rect x="3" y="9" width="3" height="1" fill="#7a5230" />
      <rect x="3" y="9" width="1" height="6" fill="#3a2418" />
      <rect x="3" y="8" width="1" height="2" fill="#d8d8c0" />
      <rect x="4" y="7" width="1" height="3" fill="#ecece0" />
      <rect x="5" y="8" width="1" height="2" fill="#d8d8c0" />

      {/* Belt */}
      <rect x="6" y="19" width="12" height="1" fill="#14110f" />
      <rect x="11" y="19" width="2" height="1" fill="#7a5230" />
      {/* Left arm — extended, holding the bow grip */}
      <rect x="5" y="12" width="2" height="2" fill="#345029" />
      <rect x="4" y="14" width="2" height="4" fill="#2e4a22" />
      <rect x="4" y="14" width="1" height="4" fill="#16240e" />
      <rect x="3" y="17" width="2" height="2" fill="#c8a878" />
      {/* Longbow — tall vertical stave, wood ramp + specular */}
      <rect x="1" y="2" width="2" height="30" fill="#5a3f24" />
      <rect x="1" y="2" width="1" height="30" fill="#8c6232" />
      <rect x="1" y="6" width="1" height="3" fill="#a8814a" />
      <rect x="2" y="2" width="1" height="30" fill="#3a2418" />
      <rect x="0" y="2" width="1" height="1" fill="#5a3a20" />
      <rect x="0" y="31" width="1" height="1" fill="#5a3a20" />
      {/* Bowstring */}
      <rect x="3" y="3" width="1" height="28" fill="#b5a282" />
      {/* Nocked arrow drawn back + steel head specular */}
      <rect x="3" y="16" width="9" height="1" fill="#d8d8c0" />
      <rect x="2" y="16" width="1" height="1" fill="#cdd6e6" />
      <rect x="2" y="16" width="1" height="1" fill="#ffffff" opacity="0.7" />
      <rect x="11" y="15" width="1" height="3" fill="#3a6a2e" />
      {/* Right arm — drawing the string back */}
      <rect x="16" y="12" width="2" height="2" fill="#345029" />
      <rect x="17" y="14" width="2" height="3" fill="#2e4a22" />
      <rect x="17" y="14" width="1" height="3" fill="#16240e" />
      <rect x="11" y="16" width="2" height="2" fill="#c8a878" />
      {/* Cloak falling down the sides */}
      <rect x="5" y="12" width="1" height="12" fill="#16240e" />
      <rect x="18" y="12" width="1" height="8" fill="#0f1c08" />

      {/* Hip / belt skirt */}
      <rect x="7" y="20" width="10" height="3" fill="#2e4a22" />
      <rect x="7" y="20" width="10" height="1" fill="#3a5a2c" />
      {/* Right leg */}
      <rect x="8" y="23" width="3" height="9" fill="#3a2e22" />
      <rect x="8" y="23" width="1" height="9" fill="#2a2018" />
      <rect x="10" y="23" width="1" height="9" fill="#1f1812" />
      {/* Left leg */}
      <rect x="13" y="23" width="3" height="9" fill="#3a2e22" />
      <rect x="13" y="23" width="1" height="9" fill="#2a2018" />
      <rect x="15" y="23" width="1" height="9" fill="#1f1812" />
      {/* Soft travelling boots */}
      <rect x="7" y="32" width="5" height="5" fill="#1f2a18" />
      <rect x="7" y="32" width="5" height="1" fill="#2e4022" />
      <rect x="7" y="37" width="5" height="1" fill="#345029" />
      <rect x="12" y="32" width="5" height="5" fill="#1f2a18" />
      <rect x="12" y="32" width="5" height="1" fill="#2e4022" />
      <rect x="12" y="37" width="5" height="1" fill="#345029" />
    </svg>
  );
}
