/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL https do joguinho acoplado (projeto separado). Vazio = card em "Em breve". */
  readonly VITE_GAME_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
