import { describe, expect, it } from 'vitest'
import { ROOT_DOMAIN, tenantSlugFromHostname } from './domains'

describe('tenant host resolution', () => {
  it('uses only the intended domain', () => {
    expect(ROOT_DOMAIN).toBe('otpthai.shop')
    expect(tenantSlugFromHostname('maillys.otpthai.shop')).toBe('maillys')
    expect(tenantSlugFromHostname('premium-store.otpthai.shop')).toBe('premium-store')
  })
  it('never treats the main site, www, or admin as tenant stores', () => {
    expect(tenantSlugFromHostname('otpthai.shop')).toBeNull()
    expect(tenantSlugFromHostname('www.otpthai.shop')).toBeNull()
    expect(tenantSlugFromHostname('admin.otpthai.shop')).toBeNull()
  })
  it('rejects extra host levels and lookalike domains', () => {
    expect(tenantSlugFromHostname('abc.maillys.otpthai.shop')).toBeNull()
    expect(tenantSlugFromHostname('maillys.otpthai.shop.attacker.com')).toBeNull()
    expect(tenantSlugFromHostname('maillysotpthai.shop')).toBeNull()
  })
  it('accepts DNS case and a trailing dot', () => {
    expect(tenantSlugFromHostname('MAILLYS.OTPTHAI.SHOP.')).toBe('maillys')
  })
  it('rejects malformed slugs', () => {
    expect(tenantSlugFromHostname('a.otpthai.shop')).toBeNull()
    expect(tenantSlugFromHostname('-abc.otpthai.shop')).toBeNull()
    expect(tenantSlugFromHostname('bad_name.otpthai.shop')).toBeNull()
  })
})
