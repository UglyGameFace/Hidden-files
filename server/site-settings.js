import { HttpError, readRepoFile, writeRepoFile } from './deal-desk.js';

export const SITE_SETTINGS_PATH = 'src/data/site-settings.json';

const CATEGORY_KEYS = ['cashback-loops', 'food-hacks', 'retail-deals'];
const ACCENT_PRESETS = new Set(['lime', 'cyan', 'amber', 'violet']);
const DENSITY_PRESETS = new Set(['compact', 'comfortable', 'spacious']);

function text(value, fallback, max = 240, min = 0) {
  const result = String(value ?? fallback ?? '').trim().slice(0, max);
  if (result.length < min) return String(fallback ?? '').trim().slice(0, max);
  return result;
}

function bool(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function integer(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function safeUrl(value, fallback = '') {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:') return fallback;
    return parsed.toString();
  } catch {
    return fallback;
  }
}

function trustItems(value, fallback) {
  const values = Array.isArray(value) ? value : [];
  const cleaned = values.map((item) => text(item, '', 48)).filter(Boolean).slice(0, 3);
  return cleaned.length === 3 ? cleaned : fallback;
}

function category(input, fallback) {
  return {
    label: text(input?.label, fallback.label, 48, 2),
    shortLabel: text(input?.shortLabel, fallback.shortLabel, 20, 1),
    description: text(input?.description, fallback.description, 180, 4),
    visible: bool(input?.visible, fallback.visible),
    order: integer(input?.order, fallback.order, 1, 99),
  };
}

export const DEFAULT_SITE_SETTINGS = {
  version: 1,
  branding: {
    name: 'The 420 Lobby',
    productName: 'Money & Food Hacks',
    brandMark: '420',
    tagline: 'Spend smarter. Eat better. Miss fewer deals.',
  },
  homepage: {
    eyebrow: 'Field guides from The 420 Lobby',
    headlinePrefix: 'Spend smarter.',
    headlineHighlight: 'Eat better.',
    headlineSuffix: 'Miss fewer deals.',
    lead: 'A fast, no-fluff library of practical cashback, food, and retail plays built for The 420 Lobby community.',
    primaryCtaLabel: 'Browse all hacks',
    secondaryCtaLabel: 'Join The 420 Lobby',
    trustItems: ['Responsible methods', 'Community updates', 'Quick-read guides'],
    showTerminal: true,
    terminalTitle: 'LOBBY_INTEL.exe',
    terminalStatus: 'READY',
    showCategories: true,
    showFeatured: true,
    featuredMinimum: 3,
    libraryKicker: 'Guide database',
    libraryTitle: 'All money & food hacks',
    libraryDescription: 'Search by store, app, method, or category.',
    showSearch: true,
    showDiscordBanner: true,
  },
  navigation: {
    browseLabel: 'Browse',
    allHacksLabel: 'All Hacks',
    allHacksDescription: 'Complete library',
  },
  categories: {
    'cashback-loops': {
      label: 'Cashback Loops', shortLabel: 'Cashback',
      description: 'Stack legitimate rewards without losing track of the math.', visible: true, order: 1,
    },
    'food-hacks': {
      label: 'Food Hacks', shortLabel: 'Food',
      description: 'Stretch restaurant and grocery budgets with repeatable plays.', visible: true, order: 2,
    },
    'retail-deals': {
      label: 'Retail Deals', shortLabel: 'Retail',
      description: 'Find, verify, and act on real markdowns and price drops.', visible: true, order: 3,
    },
  },
  discord: {
    inviteUrl: '',
    sidebarStatus: 'Community online',
    sidebarTitle: 'Get the newest plays first.',
    sidebarDescription: 'Join The 420 Lobby for live finds, updates, and member discussion.',
    sidebarButtonLabel: 'Join Discord',
    mobileDescription: 'Live finds, updates, and community discussion.',
    bannerKicker: 'The guide is step one',
    bannerTitle: 'See live finds inside The 420 Lobby.',
    bannerDescription: 'Use the website for clean evergreen instructions. Use Discord for fresh opportunities, member reports, and updates.',
    bannerButtonLabel: 'Join the community',
  },
  footer: {
    description: 'Community-tested money, food, and retail guides—organized without cluttering your Discord sidebar.',
    discordButtonLabel: 'Join Discord',
  },
  seo: {
    title: 'Money & Food Hacks | The 420 Lobby',
    description: 'Practical cashback, food, and retail deal guides from The 420 Lobby Discord community.',
    shareImage: '/og-card.svg',
  },
  theme: {
    accentPreset: 'lime',
    density: 'compact',
  },
};

export function sanitizeSiteSettings(input = {}) {
  const defaults = DEFAULT_SITE_SETTINGS;
  const settings = {
    version: 1,
    branding: {
      name: text(input.branding?.name, defaults.branding.name, 64, 2),
      productName: text(input.branding?.productName, defaults.branding.productName, 64, 2),
      brandMark: text(input.branding?.brandMark, defaults.branding.brandMark, 6, 1),
      tagline: text(input.branding?.tagline, defaults.branding.tagline, 140, 3),
    },
    homepage: {
      eyebrow: text(input.homepage?.eyebrow, defaults.homepage.eyebrow, 90, 3),
      headlinePrefix: text(input.homepage?.headlinePrefix, defaults.homepage.headlinePrefix, 70, 2),
      headlineHighlight: text(input.homepage?.headlineHighlight, defaults.homepage.headlineHighlight, 70, 2),
      headlineSuffix: text(input.homepage?.headlineSuffix, defaults.homepage.headlineSuffix, 70, 2),
      lead: text(input.homepage?.lead, defaults.homepage.lead, 320, 8),
      primaryCtaLabel: text(input.homepage?.primaryCtaLabel, defaults.homepage.primaryCtaLabel, 36, 2),
      secondaryCtaLabel: text(input.homepage?.secondaryCtaLabel, defaults.homepage.secondaryCtaLabel, 42, 2),
      trustItems: trustItems(input.homepage?.trustItems, defaults.homepage.trustItems),
      showTerminal: bool(input.homepage?.showTerminal, defaults.homepage.showTerminal),
      terminalTitle: text(input.homepage?.terminalTitle, defaults.homepage.terminalTitle, 40, 2),
      terminalStatus: text(input.homepage?.terminalStatus, defaults.homepage.terminalStatus, 20, 2),
      showCategories: bool(input.homepage?.showCategories, defaults.homepage.showCategories),
      showFeatured: bool(input.homepage?.showFeatured, defaults.homepage.showFeatured),
      featuredMinimum: integer(input.homepage?.featuredMinimum, defaults.homepage.featuredMinimum, 1, 12),
      libraryKicker: text(input.homepage?.libraryKicker, defaults.homepage.libraryKicker, 48, 2),
      libraryTitle: text(input.homepage?.libraryTitle, defaults.homepage.libraryTitle, 90, 3),
      libraryDescription: text(input.homepage?.libraryDescription, defaults.homepage.libraryDescription, 180, 3),
      showSearch: bool(input.homepage?.showSearch, defaults.homepage.showSearch),
      showDiscordBanner: bool(input.homepage?.showDiscordBanner, defaults.homepage.showDiscordBanner),
    },
    navigation: {
      browseLabel: text(input.navigation?.browseLabel, defaults.navigation.browseLabel, 24, 1),
      allHacksLabel: text(input.navigation?.allHacksLabel, defaults.navigation.allHacksLabel, 32, 2),
      allHacksDescription: text(input.navigation?.allHacksDescription, defaults.navigation.allHacksDescription, 80, 3),
    },
    categories: {},
    discord: {
      inviteUrl: safeUrl(input.discord?.inviteUrl, ''),
      sidebarStatus: text(input.discord?.sidebarStatus, defaults.discord.sidebarStatus, 42, 2),
      sidebarTitle: text(input.discord?.sidebarTitle, defaults.discord.sidebarTitle, 90, 3),
      sidebarDescription: text(input.discord?.sidebarDescription, defaults.discord.sidebarDescription, 220, 5),
      sidebarButtonLabel: text(input.discord?.sidebarButtonLabel, defaults.discord.sidebarButtonLabel, 36, 2),
      mobileDescription: text(input.discord?.mobileDescription, defaults.discord.mobileDescription, 160, 4),
      bannerKicker: text(input.discord?.bannerKicker, defaults.discord.bannerKicker, 48, 2),
      bannerTitle: text(input.discord?.bannerTitle, defaults.discord.bannerTitle, 110, 3),
      bannerDescription: text(input.discord?.bannerDescription, defaults.discord.bannerDescription, 260, 5),
      bannerButtonLabel: text(input.discord?.bannerButtonLabel, defaults.discord.bannerButtonLabel, 42, 2),
    },
    footer: {
      description: text(input.footer?.description, defaults.footer.description, 260, 5),
      discordButtonLabel: text(input.footer?.discordButtonLabel, defaults.footer.discordButtonLabel, 36, 2),
    },
    seo: {
      title: text(input.seo?.title, defaults.seo.title, 70, 8),
      description: text(input.seo?.description, defaults.seo.description, 180, 20),
      shareImage: text(input.seo?.shareImage, defaults.seo.shareImage, 180, 1),
    },
    theme: {
      accentPreset: ACCENT_PRESETS.has(input.theme?.accentPreset) ? input.theme.accentPreset : defaults.theme.accentPreset,
      density: DENSITY_PRESETS.has(input.theme?.density) ? input.theme.density : defaults.theme.density,
    },
  };

  for (const key of CATEGORY_KEYS) {
    settings.categories[key] = category(input.categories?.[key], defaults.categories[key]);
  }

  return settings;
}

export async function readSiteSettings() {
  const file = await readRepoFile(SITE_SETTINGS_PATH, { allowMissing: true });
  if (!file.content.trim()) {
    return { sha: null, settings: structuredClone(DEFAULT_SITE_SETTINGS) };
  }
  try {
    return { sha: file.sha, settings: sanitizeSiteSettings(JSON.parse(file.content)) };
  } catch {
    throw new HttpError(502, 'The site settings file contains invalid JSON.');
  }
}

export async function writeSiteSettings(settings, sha) {
  const clean = sanitizeSiteSettings(settings);
  const content = `${JSON.stringify(clean, null, 2)}\n`;
  const result = await writeRepoFile(
    SITE_SETTINGS_PATH,
    content,
    'Lobby Control Center: publish site settings',
    sha,
  );
  return {
    settings: clean,
    sha: result.content?.sha || null,
    commit: result.commit?.sha || null,
  };
}
