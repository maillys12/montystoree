import {describe,expect,it} from 'vitest'
import {promptpayPayload} from './promptpay'

describe('wallet PromptPay payment payload',()=>{
 it('encodes a mobile number, THB amount and CRC',()=>{
  const qr=promptpayPayload('0812345678',125.5)
  expect(qr).toContain('01130066812345678')
  expect(qr).toContain('5303764')
  expect(qr).toContain('5406125.50')
  expect(qr).toMatch(/6304[0-9A-F]{4}$/)
 })
 it('uses the tax ID slot for a 13-digit number',()=>{
  expect(promptpayPayload('1234567890123',100)).toContain('02131234567890123')
 })
 it('rejects invalid payee or amount rather than displaying an unusable QR',()=>{
  expect(()=>promptpayPayload('123',100)).toThrow()
  expect(()=>promptpayPayload('0812345678',0)).toThrow()
  expect(()=>promptpayPayload('0812345678',1000001)).toThrow()
 })
})
