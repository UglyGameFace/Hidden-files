/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_DISCORD_INVITE_URL?: string;
  readonly PUBLIC_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
