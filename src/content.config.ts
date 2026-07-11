import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const hacks = defineCollection({
  loader: glob({ base: './src/content/hacks', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(['cashback-loops', 'food-hacks', 'retail-deals']),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
    badge: z.string().optional(),
    keywords: z.array(z.string()).default([]),
    published: z.coerce.date(),
    updated: z.coerce.date().optional(),
    readTime: z.string().default('5 min'),
    order: z.number().int().default(999),
  }),
});

export const collections = { hacks };
