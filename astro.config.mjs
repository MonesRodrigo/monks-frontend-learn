// @ts-check
import { readdirSync, readFileSync } from 'node:fs'
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

// Single source of truth for where the site is published. Everything else
// (links, tests) derives from the built output, never from a literal path.
const SITE = process.env.SITE_URL ?? 'https://MonesRodrigo.github.io'
const BASE = process.env.SITE_BASE ?? '/monks-frontend-learn'

// Sidebar order of the `track` values in src/content.config.ts.
const TRACKS = {
  onboarding: 'Onboarding',
  'best-practices': 'Best practices',
  tooling: 'Tooling',
  a11y: 'Accessibility',
  performance: 'Performance',
  'ai-dev': 'AI in development',
}
const LEVELS = ['intro', 'intermediate', 'advanced']
const GUIDES_DIR = new URL('./src/content/docs/guides/', import.meta.url)

/** One sidebar group per track, easiest guides first. */
function guidesByTrack() {
  const guides = readdirSync(GUIDES_DIR)
    .filter((file) => /\.mdx?$/.test(file))
    .sort()
    .map((file) => {
      const frontmatter = readFileSync(new URL(file, GUIDES_DIR), 'utf8').match(
        /^---\n([\s\S]*?)\n---/,
      )?.[1]
      const field = (/** @type {string} */ name) =>
        frontmatter
          ?.match(new RegExp(`^${name}:\\s*(.+)$`, 'm'))?.[1]
          .trim()
          .replace(/^['"]|['"]$/g, '')
      const track = field('track')
      if (!track || !(track in TRACKS)) {
        throw new Error(`guides/${file}: unknown track "${track}". Add it to TRACKS.`)
      }
      return {
        slug: `guides/${file.replace(/\.mdx?$/, '')}`,
        track,
        level: LEVELS.indexOf(field('level') ?? 'intro'),
      }
    })

  return Object.entries(TRACKS)
    .map(([track, label]) => ({
      label,
      items: guides
        .filter((guide) => guide.track === track)
        .sort((a, b) => a.level - b.level)
        .map(({ slug }) => ({ slug })),
    }))
    .filter((group) => group.items.length > 0)
}

// https://astro.build/config
export default defineConfig({
  site: SITE,
  base: BASE,
  integrations: [
    starlight({
      title: 'Frontend Learn',
      customCss: ['./src/styles/custom.css'],
      sidebar: guidesByTrack(),
    }),
  ],
})
