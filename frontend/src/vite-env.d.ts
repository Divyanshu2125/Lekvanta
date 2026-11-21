/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DESCOPE_PROJECT_ID: string;
  readonly VITE_DESCOPE_FLOW_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
