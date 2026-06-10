// Chapter count for the full chained run. Lives in a standalone,
// dependency-free module so eager callers (delveStore) can read it without
// pulling the heavy createDelve graph (chapter pools + bestiary) into the
// initial bundle. Drift is caught by createDelve.test.ts, which asserts the
// generated boss chain length equals TOTAL_CHAPTERS.
export const TOTAL_CHAPTERS = 14;

// Where the BASE game ends: the soul climbs the cells-to-Velnaris arc (Ch1-11)
// and felling Velnaris in his own hell wins the base campaign. The remaining
// Throne-of-the Slain God chapters (Ch12 Hargan-Vor, Ch13 Korvazel, Ch14 Maevra) are
// New Game+ only — a base run builds just these eleven chapters and ten camp
// seams, and finishDelve fires the win when the run beats ITS OWN last chapter
// (the delve carries its chapterCount), so base ends at Velnaris and NG+ at the
// Throne. NG+ replays Ch1-11 then continues through Ch12-14 at a chosen ascension.
export const BASE_GAME_CHAPTERS = 11;
