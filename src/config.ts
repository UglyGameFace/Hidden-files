import siteSettings from './data/site-settings.json';

export const SITE_SETTINGS = siteSettings;

export const SITE = {
  name: siteSettings.branding.name,
  productName: siteSettings.branding.productName,
  brandMark: siteSettings.branding.brandMark,
  tagline: siteSettings.branding.tagline,
  title: siteSettings.seo.title,
  description: siteSettings.seo.description,
  shareImage: siteSettings.seo.shareImage,
  discordInvite:
    siteSettings.discord.inviteUrl ||
    import.meta.env.PUBLIC_DISCORD_INVITE_URL ||
    'https://discord.gg/your-permanent-invite',
  siteUrl: import.meta.env.PUBLIC_SITE_URL ?? 'https://example.vercel.app',
} as const;

export const CATEGORIES = {
  'cashback-loops': {
    ...siteSettings.categories['cashback-loops'],
    icon: 'loop',
    accent: 'lime',
  },
  'food-hacks': {
    ...siteSettings.categories['food-hacks'],
    icon: 'food',
    accent: 'amber',
  },
  'retail-deals': {
    ...siteSettings.categories['retail-deals'],
    icon: 'tag',
    accent: 'cyan',
  },
} as const;

export type CategoryKey = keyof typeof CATEGORIES;

export const CATEGORY_ENTRIES = (Object.entries(CATEGORIES) as [CategoryKey, (typeof CATEGORIES)[CategoryKey]][])
  .filter(([, category]) => category.visible)
  .sort((a, b) => a[1].order - b[1].order);

export const THEME_PRESETS = {
  lime: {
    accent: '#b7ff3c',
    rgb: '183 255 60',
    soft: 'rgb(183 255 60 / .09)',
    onAccent: '#080b07',
  },
  cyan: {
    accent: '#55dff4',
    rgb: '85 223 244',
    soft: 'rgb(85 223 244 / .09)',
    onAccent: '#061013',
  },
  amber: {
    accent: '#ffbd4a',
    rgb: '255 189 74',
    soft: 'rgb(255 189 74 / .09)',
    onAccent: '#120d03',
  },
  violet: {
    accent: '#a78bfa',
    rgb: '167 139 250',
    soft: 'rgb(167 139 250 / .09)',
    onAccent: '#0e0918',
  },
} as const;

export const ACTIVE_THEME = THEME_PRESETS[SITE_SETTINGS.theme.accentPreset as keyof typeof THEME_PRESETS]
  ?? THEME_PRESETS.lime;
