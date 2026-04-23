import { MENU_CATALOG } from '../catalog'
import { recommendMenus } from '../recommend'

describe('recommendMenus', () => {
  it('returns up to 3 items by default', () => {
    expect(recommendMenus({}).length).toBeLessThanOrEqual(3)
  })

  it('filters out condition-excluded items (เบาหวาน = no ขนมหวาน)', () => {
    const r = recommendMenus({ conditions: ['เบาหวาน'], limit: 10 })
    expect(r.some((m) => m.name === 'ขนมหวาน')).toBe(false)
  })

  it('filters out allergen-containing items', () => {
    const r = recommendMenus({ allergies: ['กุ้ง'], limit: 10 })
    expect(r.some((m) => m.allergensContained.includes('กุ้ง'))).toBe(false)
  })

  it('filters out disliked names', () => {
    const r = recommendMenus({
      dislikes: ['ข้าวผัดกะเพราไก่'],
      limit: 10,
    })
    expect(r.some((m) => m.name === 'ข้าวผัดกะเพราไก่')).toBe(false)
  })

  it('honours custom limit', () => {
    expect(recommendMenus({ limit: 1 }).length).toBe(1)
  })

  it('all items are in the catalog', () => {
    const r = recommendMenus({ limit: 10 })
    for (const item of r) {
      expect(MENU_CATALOG.find((m) => m.id === item.id)).toBeTruthy()
    }
  })
})
