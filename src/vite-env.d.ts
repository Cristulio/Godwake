/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Deployed feedback Worker URL. When unset, the in-game feedback UI is hidden. */
  readonly VITE_FEEDBACK_URL?: string;
  /** Optional human version string surfaced with feedback reports. */
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
