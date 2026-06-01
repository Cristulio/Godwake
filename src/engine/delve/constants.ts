// Chapter count for the full chained run. Lives in a standalone,
// dependency-free module so eager callers (delveStore) can read it without
// pulling the heavy createDelve graph (chapter pools + bestiary) into the
// initial bundle. Drift is caught by createDelve.test.ts, which asserts the
// generated boss chain length equals TOTAL_CHAPTERS.
export const TOTAL_CHAPTERS = 14;
