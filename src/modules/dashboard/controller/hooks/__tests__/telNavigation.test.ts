/**
 * @jest-environment jsdom
 */
import { navigateToTel } from '../telNavigation'

describe('navigateToTel', () => {
  it('sets window.location.href to the tel: url', () => {
    // jsdom 26 makes window.location non-configurable on the global, so we
    // intercept the href setter on LocationImpl.prototype (which is configurable)
    // by locating the impl via its well-known Symbol(impl) own-symbol.
    const implSym = Object.getOwnPropertySymbols(window.location).find(
      (s) => s.description === 'impl',
    )!
    const impl = (window.location as unknown as Record<symbol, object>)[implSym]
    const implProto = Object.getPrototypeOf(impl) as object
    const originalDesc = Object.getOwnPropertyDescriptor(implProto, 'href')!

    const hrefSetter = jest.fn()
    Object.defineProperty(implProto, 'href', { ...originalDesc, set: hrefSetter })

    try {
      navigateToTel('0812345678')
      expect(hrefSetter).toHaveBeenCalledWith('tel:0812345678')
    } finally {
      Object.defineProperty(implProto, 'href', originalDesc)
    }
  })

})
