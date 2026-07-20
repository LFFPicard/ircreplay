import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const DIST_DIR = join(process.cwd(), 'dist')
const SITE_URL = 'https://ircreplay.app'

const routes = [
  {
    route: 'about',
    title: 'About IRCReplay — IRC Log Viewer',
    description: 'The story behind IRCReplay, the browser-based successor to mIRCStats.',
  },
  {
    route: 'help',
    title: 'Help & FAQ — IRCReplay',
    description: 'How to load IRC logs, supported formats, cloud storage, share links and more.',
  },
  {
    route: 'pricing',
    title: 'Pricing — IRCReplay Pro',
    description: 'IRCReplay is free forever. Pro adds cloud storage, share links and extended stats from £3.49/month.',
  },
  {
    route: 'terms',
    title: 'Terms of Service — IRCReplay',
    description: 'Terms of service for IRCReplay.app.',
  },
  {
    route: 'privacy',
    title: 'Privacy Policy — IRCReplay',
    description: 'How IRCReplay handles your data. Free tier logs never leave your browser.',
  },
  {
    route: 'refunds',
    title: 'Refund Policy — IRCReplay',
    description: '14-day money back guarantee on all IRCReplay Pro plans.',
  },
]

function escapeAmp(str) {
  return str.replace(/&/g, '&amp;')
}

function replaceOrThrow(html, regex, replacement, label) {
  if (!regex.test(html)) {
    throw new Error(`prerender: pattern for "${label}" did not match dist/index.html — aborting build`)
  }
  return html.replace(regex, replacement)
}

function buildPage(sourceHtml, { route, title, description }) {
  const safeTitle = escapeAmp(title)
  const safeDescription = escapeAmp(description)
  const url = `${SITE_URL}/${route}`

  let html = sourceHtml

  html = replaceOrThrow(
    html,
    /<title>[^<]*<\/title>/,
    `<title>${safeTitle}</title>`,
    'title'
  )

  html = replaceOrThrow(
    html,
    /<meta name="description" content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${safeDescription}" />`,
    'meta description'
  )

  html = replaceOrThrow(
    html,
    /<link rel="canonical" href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${url}" />`,
    'canonical link'
  )

  html = replaceOrThrow(
    html,
    /<meta property="og:title" content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${safeTitle}" />`,
    'og:title'
  )

  html = replaceOrThrow(
    html,
    /<meta property="og:description" content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${safeDescription}" />`,
    'og:description'
  )

  html = replaceOrThrow(
    html,
    /<meta property="og:url" content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${url}" />`,
    'og:url'
  )

  html = replaceOrThrow(
    html,
    /<meta name="twitter:title" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${safeTitle}" />`,
    'twitter:title'
  )

  html = replaceOrThrow(
    html,
    /<meta name="twitter:description" content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${safeDescription}" />`,
    'twitter:description'
  )

  return html
}

function main() {
  const indexPath = join(DIST_DIR, 'index.html')
  const sourceHtml = readFileSync(indexPath, 'utf-8')

  for (const routeInfo of routes) {
    const outDir = join(DIST_DIR, routeInfo.route)
    mkdirSync(outDir, { recursive: true })
    const html = buildPage(sourceHtml, routeInfo)
    writeFileSync(join(outDir, 'index.html'), html, 'utf-8')
  }

  console.log(`prerender: wrote ${routes.length} static route(s) to dist/`)
}

main()
