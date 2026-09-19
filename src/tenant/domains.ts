/**
 * A single Vercel deployment serves the main site and tenant hosts.
 * DNS/SSL for *.otpthai.shop must be configured separately in Vercel.
 */
export const ROOT_DOMAIN = 'otpthai.shop'

const TENANT_SLUG = /^[a-z0-9][a-z0-9-]{2,39}$/
const RESERVED = new Set(['www', 'admin', 'api', 'auth', 'login', 'register', 'rent', 'support', 'dashboard', 'app', 'shop', 'montystoree'])

export function tenantSlugFromHostname(hostname: string): string | null {
  const host = hostname.toLowerCase().replace(/\.$/, '')
  const suffix = '.' + ROOT_DOMAIN
  if (!host.endsWith(suffix)) return null
  const prefix = host.slice(0, -suffix.length)
  return TENANT_SLUG.test(prefix) && !RESERVED.has(prefix) ? prefix : null
}

export function tenantUrl(slug: string): string {
  if (!TENANT_SLUG.test(slug) || RESERVED.has(slug)) throw new Error('Invalid store slug')
  // Retain the working route on the Vercel preview until wildcard DNS and
  // a certificate are confirmed on the custom domain.
  if (location.hostname === ROOT_DOMAIN || location.hostname.endsWith('.' + ROOT_DOMAIN)) {
    return `https://${slug}.${ROOT_DOMAIN}/`
  }
  return `${location.origin}/s/${encodeURIComponent(slug)}`
}
