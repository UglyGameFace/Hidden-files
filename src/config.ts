export const SITE = {
  name: 'The 420 Lobby',
  productName: 'Money & Food Hacks',
  title: 'Money & Food Hacks | The 420 Lobby',
  description:
    'Practical cashback, food, and retail deal guides from The 420 Lobby Discord community.',
  discordInvite:
    import.meta.env.PUBLIC_DISCORD_INVITE_URL ??
    'https://discord.gg/your-permanent-invite',
  siteUrl: import.meta.env.PUBLIC_SITE_URL ?? 'https://example.vercel.app',
} as const;

export const CATEGORIES = {
  'cashback-loops': {
    label: 'Cashback Loops',
    shortLabel: 'Cashback',
    description: 'Stack legitimate rewards without losing track of the math.',
    icon: 'loop',
    accent: 'lime',
  },
  'food-hacks': {
    label: 'Food Hacks',
    shortLabel: 'Food',
    description: 'Stretch restaurant and grocery budgets with repeatable plays.',
    icon: 'food',
    accent: 'amber',
  },
  'retail-deals': {
    label: 'Retail Deals',
    shortLabel: 'Retail',
    description: 'Find, verify, and act on real markdowns and price drops.',
    icon: 'tag',
    accent: 'cyan',
  },
} as const;

export type CategoryKey = keyof typeof CATEGORIES;
