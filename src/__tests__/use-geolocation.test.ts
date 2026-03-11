import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getGeolocationErrorMessage } from '@/hooks/use-geolocation'

describe('getGeolocationErrorMessage', () => {
  it('PERMISSION_DENIEDに対して適切な日本語メッセージを返す', () => {
    expect(getGeolocationErrorMessage(1)).toBe('位置情報の利用が許可されていません')
  })

  it('POSITION_UNAVAILABLEに対して適切な日本語メッセージを返す', () => {
    expect(getGeolocationErrorMessage(2)).toBe('現在位置を取得できません')
  })

  it('TIMEOUTに対して適切な日本語メッセージを返す', () => {
    expect(getGeolocationErrorMessage(3)).toBe('位置情報の取得がタイムアウトしました')
  })

  it('未知のエラーコードに対してデフォルトメッセージを返す', () => {
    expect(getGeolocationErrorMessage(99)).toBe('現在位置を取得できません')
  })
})
