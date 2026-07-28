import { defineCollection } from 'astro:content'
import { z } from 'astro:schema'
import { docsLoader } from '@astrojs/starlight/loaders'
import { docsSchema } from '@astrojs/starlight/schema'

export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		// Extend Starlight's schema with our editorial metadata.
		// `astro check` fails the build if any of these are missing/invalid.
		schema: docsSchema({
			extend: z.object({
				// Short teaser used in listings and social cards.
				summary: z.string().max(200),
				format: z
					.enum(['article', 'video', 'snippet', 'checklist', 'playbook', 'adr', 'workshop'])
					.default('article'),
				track: z.enum([
					'best-practices',
					'ai-dev',
					'performance',
					'a11y',
					'onboarding',
					'tooling',
				]),
				level: z.enum(['intro', 'intermediate', 'advanced']).default('intro'),
				author: z.string(),
				publishedAt: z.coerce.date(),
				updatedAt: z.coerce.date().optional(),
				// Hard expiry date. A monthly cron opens an issue when this passes.
				reviewBy: z.coerce.date(),
				videoId: z.string().optional(),
				status: z.enum(['draft', 'review', 'published', 'deprecated']).default('draft'),
			}),
		}),
	}),
}