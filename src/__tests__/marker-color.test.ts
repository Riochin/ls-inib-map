import { describe, it, expect } from 'vitest'
import { getMarkerColor, getGameLabel } from '@/lib/marker-color'
import type { Store } from '@/types/store'

function makeStore(games: Store['games']): Store {
  return { id: 'test', name: 'テスト店舗', address: '東京都', lat: 35.68, lng: 139.77, games }
}

describe('getMarkerColor', () => {
  it('ラスサバ単独店舗は紫色を返す', () => {
    expect(getMarkerColor(makeStore(['jojo-ls']))).toBe('#7B2FBE')
  })

  it('イニブ単独店舗は緑色を返す', () => {
    expect(getMarkerColor(makeStore(['gundam-exvs']))).toBe('#2E8B57')
  })

  it('両タイトル稼働店舗はオレンジ色を返す', () => {
    expect(getMarkerColor(makeStore(['jojo-ls', 'gundam-exvs']))).toBe('#FF8C00')
  })
})

describe('getGameLabel', () => {
  it('jojo-lsに対して「ラスサバ」を返す', () => {
    expect(getGameLabel('jojo-ls')).toBe('ラスサバ')
  })

  it('gundam-exvsに対して「イニブ」を返す', () => {
    expect(getGameLabel('gundam-exvs')).toBe('イニブ')
  })
})
