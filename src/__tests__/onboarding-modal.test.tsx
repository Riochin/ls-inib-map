import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { OnboardingModal, decideAutoOpen, NOTICE, NEWS_PAGE_INDEX, PAGE_COUNT } from '@/components/Onboarding'
import { latestRelease } from '@/data/releases'

const noop = () => {}

describe('OnboardingModal — アクセシビリティ', () => {
  it('dialog として意味付けされ、固定のラベルを持つ', () => {
    const html = renderToStaticMarkup(<OnboardingModal onClose={noop} onOpenFeedback={noop} />)
    const dialog = html.match(/<div[^>]*role="dialog"[^>]*>/)
    expect(dialog?.[0]).toContain('aria-modal="true"')
    expect(dialog?.[0]).toContain('aria-label="操作案内"')
  })

  it('ページインジケータが現在ページを読み上げ用テキストで示す', () => {
    const html = renderToStaticMarkup(<OnboardingModal initialPage={2} onClose={noop} onOpenFeedback={noop} />)
    expect(html).toContain('aria-label="6ページ中3ページ目"')
  })
})

describe('OnboardingModal — イニブ店舗情報の注意ページ', () => {
  it('注意が有効な間は全6ページで、新機能ページが末尾にある', () => {
    expect(NOTICE).not.toBeNull()
    expect(PAGE_COUNT).toBe(6)
    expect(NEWS_PAGE_INDEX).toBe(5)
  })

  it('1ページ目に注意ページが出る', () => {
    const html = renderToStaticMarkup(<OnboardingModal onClose={noop} onOpenFeedback={noop} />)
    expect(html).toContain('イニブの店舗情報について')
    expect(html).toContain('最新ではない可能性があります')
    expect(html).toContain('ラスサバの店舗情報は、これまでどおり更新しています')
    // 従来の1ページ目（操作案内）は2ページ目へ下がる
    expect(html).not.toContain('戦場選びをサクッと')
  })

  it('2ページ目が従来の操作案内になる', () => {
    const html = renderToStaticMarkup(<OnboardingModal initialPage={1} onClose={noop} onOpenFeedback={noop} />)
    expect(html).toContain('戦場選びをサクッと')
    expect(html).not.toContain('イニブの店舗情報について')
  })
})

describe('decideAutoOpen — 自動表示の判定', () => {
  const noticeId = NOTICE!.id
  const news = latestRelease.version

  it('初回ユーザーは1ページ目（注意ページ）から開く', () => {
    expect(decideAutoOpen({ onboarded: null, newsSeen: null, noticeSeen: null })).toEqual({
      page: 0,
      source: 'auto_first_visit',
    })
  })

  it('新機能を既読の再訪ユーザーにも、注意が未読なら1ページ目から開く', () => {
    expect(decideAutoOpen({ onboarded: '1', newsSeen: news, noticeSeen: null })).toEqual({
      page: 0,
      source: 'auto_notice',
    })
  })

  it('注意は既読・新機能が未読なら新機能ページから開く', () => {
    expect(decideAutoOpen({ onboarded: '1', newsSeen: '0.0', noticeSeen: noticeId })).toEqual({
      page: NEWS_PAGE_INDEX,
      source: 'auto_news',
    })
  })

  it('注意も新機能も既読なら自動では開かない', () => {
    expect(decideAutoOpen({ onboarded: '1', newsSeen: news, noticeSeen: noticeId })).toBeNull()
  })
})
