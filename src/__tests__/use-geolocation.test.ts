import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getGeolocationErrorMessage } from '@/hooks/use-geolocation'

describe('getGeolocationErrorMessage', () => {
  it('PERMISSION_DENIEDに対して許可を促すメッセージを返す', () => {
    expect(getGeolocationErrorMessage(1)).toBe(
      '現在地を表示するには、ブラウザの設定で位置情報を許可してください'
    )
  })

  it('POSITION_UNAVAILABLEに対して適切な日本語メッセージを返す', () => {
    expect(getGeolocationErrorMessage(2)).toBe(
      '現在地を取得できませんでした。少し時間をおいてお試しください'
    )
  })

  it('TIMEOUTに対して適切な日本語メッセージを返す', () => {
    expect(getGeolocationErrorMessage(3)).toBe(
      '位置情報の取得に時間がかかっています。もう一度お試しください'
    )
  })

  it('未知のエラーコードに対してデフォルトメッセージを返す', () => {
    expect(getGeolocationErrorMessage(99)).toBe(
      '現在地を取得できませんでした。少し時間をおいてお試しください'
    )
  })
})
