import { describe, it, expect } from 'vitest'
import {
  buildFeedbackIssue,
  buildStructuredStoreIssue,
  FEEDBACK_LABEL,
  type FeedbackInput,
  type StructuredStoreInput,
} from '@/lib/report'

// --------  buildFeedbackIssue  --------

describe('buildFeedbackIssue', () => {
  const base: FeedbackInput = {
    category: '新機能の提案',
    content: 'こんな機能が欲しいです',
  }

  it('タイトルにカテゴリと内容の先頭が含まれる', () => {
    const { title } = buildFeedbackIssue(base)
    expect(title).toContain('新機能の提案')
    expect(title).toContain('こんな機能が欲しいです')
  })

  it('本文に category・content が出力される', () => {
    const { body } = buildFeedbackIssue(base)
    expect(body).toContain('新機能の提案')
    expect(body).toContain('こんな機能が欲しいです')
  })

  it('全4カテゴリを正しく扱える', () => {
    const categories = ['新機能の提案', '既存機能の改善', '不具合', 'その他'] as const
    for (const category of categories) {
      const { title, body } = buildFeedbackIssue({ ...base, category })
      expect(title).toContain(category)
      expect(body).toContain(category)
    }
  })

  it('SNS ID 未記入は「みんなの報告（未確認）」扱いで確定不可', () => {
    const { body } = buildFeedbackIssue(base)
    expect(body).toContain('SNS ID: （未記入）')
    expect(body).toContain('未確認')
  })

  it('SNS ID 提供ありは確定可', () => {
    const { body } = buildFeedbackIssue({ ...base, reporter: 'myid' })
    expect(body).toContain('SNS ID: myid')
    expect(body).toContain('確定可能')
  })

  it('noMention=true は本文にメンション不可が明示される', () => {
    const { body } = buildFeedbackIssue({ ...base, reporter: 'myid', noMention: true })
    expect(body).toContain('不可')
  })

  it('@メンション / #Issue 参照を無効化する', () => {
    const { body } = buildFeedbackIssue({
      category: 'その他',
      content: '@user に連絡してほしい #99',
      reporter: '@myhandle',
    })
    expect(body).not.toContain('@user')
    expect(body).not.toContain('@myhandle')
    expect(body).not.toContain('#99')
    expect(body).toContain('@​')
  })
})

// --------  buildStructuredStoreIssue  --------

describe('buildStructuredStoreIssue', () => {
  const base: StructuredStoreInput = {
    storeId: 'store-001',
    storeName: 'テスト店',
    storeAddress: '東京都新宿区1-1-1',
  }

  it('入力済みフィールドのみが本文に出力される（businessHours）', () => {
    const { body } = buildStructuredStoreIssue({ ...base, businessHours: '10:00-23:00' })
    expect(body).toContain('10:00-23:00')
  })

  it('未入力フィールド（businessHours）は本文に含めない', () => {
    const { body } = buildStructuredStoreIssue(base)
    expect(body).not.toContain('businessHours')
    expect(body).not.toContain('営業時間')
  })

  it('部分入力（smoking のみ）で smoking のみ出力する', () => {
    const { body } = buildStructuredStoreIssue({ ...base, smoking: 'no' })
    expect(body).toContain('喫煙所')
    expect(body).not.toContain('営業時間')
    expect(body).not.toContain('フロア')
  })

  it('payments 配列をカンマ区切りで整形する', () => {
    const { body } = buildStructuredStoreIssue({ ...base, payments: ['Suica', 'PayPay', 'iD'] })
    expect(body).toContain('Suica')
    expect(body).toContain('PayPay')
    expect(body).toContain('iD')
  })

  it('machineCountsJojoLs を本文に含める', () => {
    const { body } = buildStructuredStoreIssue({ ...base, machineCountsJojoLs: 3 })
    expect(body).toContain('3')
  })

  it('フロアが両ゲーム同値なら1行（フロア）にまとめる', () => {
    const { body } = buildStructuredStoreIssue({ ...base, floorJojoLs: '2F', floorGundamExvs: '2F' })
    expect(body).toContain('| フロア | 2F |')
    expect(body).not.toContain('フロア（ラスサバ）')
    expect(body).not.toContain('フロア（イニブ）')
  })

  it('フロアが別値ならタイトル別の2行で出力する', () => {
    const { body } = buildStructuredStoreIssue({ ...base, floorJojoLs: '2F', floorGundamExvs: '3F' })
    expect(body).toContain('フロア（ラスサバ）')
    expect(body).toContain('2F')
    expect(body).toContain('フロア（イニブ）')
    expect(body).toContain('3F')
    expect(body).not.toContain('| フロア | ')
  })

  it('片方のゲームのフロアのみ入力されたときはそのタイトルだけ出力する', () => {
    const { body } = buildStructuredStoreIssue({ ...base, floorGundamExvs: '4F' })
    expect(body).toContain('フロア（イニブ）')
    expect(body).toContain('4F')
    expect(body).not.toContain('フロア（ラスサバ）')
  })

  it('correctionType を本文に含める', () => {
    const { body } = buildStructuredStoreIssue({ ...base, correctionType: '閉店・移設' })
    expect(body).toContain('閉店・移設')
  })

  it('録画台/配信台はタイトル別の行で出力する', () => {
    const { body } = buildStructuredStoreIssue({
      ...base,
      hasRecordingGundamExvs: 'yes',
      hasStreamingJojoLs: 'no',
    })
    expect(body).toContain('録画台（イニブ）')
    expect(body).toContain('配信台（ラスサバ）')
  })

  it('入力されたタイトルの録画台/配信台のみ出力する', () => {
    const { body } = buildStructuredStoreIssue({ ...base, hasRecordingJojoLs: 'unknown' })
    expect(body).toContain('録画台（ラスサバ）')
    expect(body).not.toContain('録画台（イニブ）')
    expect(body).not.toContain('配信台')
  })

  it('タイトルに店名が含まれる', () => {
    const { title } = buildStructuredStoreIssue(base)
    expect(title).toContain('テスト店')
  })

  it('本文に store-id が含まれる', () => {
    const { body } = buildStructuredStoreIssue(base)
    expect(body).toContain('store-001')
  })

  it('SNS ID 未記入は「未確認（みんなの報告）」と明示', () => {
    const { body } = buildStructuredStoreIssue(base)
    expect(body).toContain('未確認')
  })

  it('SNS ID 提供ありは確定可能と明示', () => {
    const { body } = buildStructuredStoreIssue({ ...base, reporter: 'myid' })
    expect(body).toContain('myid')
    expect(body).toContain('確定可能')
  })

  it('@メンション / #Issue 参照を無効化する', () => {
    const { body } = buildStructuredStoreIssue({
      ...base,
      storeName: '@shop',
      correctionNote: 'cc @admin, #99',
      reporter: '@reporter',
    })
    expect(body).not.toContain('@shop')
    expect(body).not.toContain('@admin')
    expect(body).not.toContain('@reporter')
    expect(body).not.toContain('#99')
  })

  it('テーブルセル内の | をエスケープし、改行を空白へ潰す（行崩れ防止）', () => {
    const { body } = buildStructuredStoreIssue({
      ...base,
      businessHours: '10:00-23:00 | 不定休',
      correctionNote: '1行目\n2行目',
    })
    // 生の | はセル区切りなのでエスケープされている
    expect(body).toContain('10:00-23:00 \\| 不定休')
    // 改行はセル内に残らない（テーブルが崩れない）
    expect(body).toContain('1行目 2行目')
    expect(body).not.toContain('1行目\n2行目')
  })
})

// --------  定数  --------

describe('定数', () => {
  it('FEEDBACK_LABEL は アプリ要望', () => {
    expect(FEEDBACK_LABEL).toBe('アプリ要望')
  })
})

// --------  Issue 本文スナップショット（ver2.6 属性レジストリ化の前後で一致させる基準）  --------

describe('buildStructuredStoreIssue — 本文スナップショット', () => {
  const base: StructuredStoreInput = {
    storeId: 'store-001',
    storeName: 'テスト店',
    storeAddress: '東京都新宿区1-1-1',
  }

  it('全項目入り（両ゲーム同フロア）', () => {
    const { title, body } = buildStructuredStoreIssue({
      ...base,
      reporter: 'myid',
      noMention: true,
      machineCountsJojoLs: 3,
      machineCountsGundamExvs: 0,
      businessHours: '10:00〜23:00',
      floorJojoLs: '2F',
      floorGundamExvs: '2F',
      smoking: 'unknown',
      payments: ['PayPay', 'iD'],
      hasRecordingJojoLs: 'yes',
      hasRecordingGundamExvs: 'yes',
      hasStreamingJojoLs: 'no',
      hasStreamingGundamExvs: 'unknown',
      correctionType: '位置ズレ',
      correctionNote: 'ピンが南側にずれています',
    })
    expect(title).toMatchInlineSnapshot(`"[ユーザー報告] テスト店 — 店舗情報の提供"`)
    expect(body).toMatchInlineSnapshot(`
      "[自動投稿] アプリ内「情報を提供」フォームからの報告です。

      - store-id: store-001
      - 店名: テスト店
      - 住所: 東京都新宿区1-1-1
      - SNS ID: myid
      - 確定可否: SNS ID提供あり → 確定可能
      - お礼リプライ: 不可（メンション希望なし）

      ## 提案値一覧
      | 項目 | 提案値 |
      |------|--------|
      | ジョジョ台数 | 3 |
      | イニブ台数 | 0 |
      | 営業時間 | 10:00〜23:00 |
      | フロア | 2F |
      | 喫煙所 | 不明 |
      | 決済/電子マネー | PayPay, iD |
      | 録画台（ラスサバ） | あり |
      | 録画台（イニブ） | あり |
      | 配信台（ラスサバ） | なし |
      | 配信台（イニブ） | 不明 |
      | 修正・通報種別 | 位置ズレ |
      | 修正・通報メモ | ピンが南側にずれています |"
    `)
  })

  it('別フロア・片方のゲームだけの設備', () => {
    const { body } = buildStructuredStoreIssue({
      ...base,
      floorJojoLs: '2F',
      floorGundamExvs: '3F',
      hasStreamingGundamExvs: 'yes',
    })
    expect(body).toMatchInlineSnapshot(`
      "[自動投稿] アプリ内「情報を提供」フォームからの報告です。

      - store-id: store-001
      - 店名: テスト店
      - 住所: 東京都新宿区1-1-1
      - SNS ID: （未記入）
      - 確定可否: SNS ID未記入 → 未確認（みんなの報告）扱い
      - お礼リプライ: —

      ## 提案値一覧
      | 項目 | 提案値 |
      |------|--------|
      | フロア（ラスサバ） | 2F |
      | フロア（イニブ） | 3F |
      | 配信台（イニブ） | あり |"
    `)
  })

  it('片方のゲームのフロアだけ・決済は空配列', () => {
    const { body } = buildStructuredStoreIssue({ ...base, floorGundamExvs: '4F', payments: [] })
    expect(body).toMatchInlineSnapshot(`
      "[自動投稿] アプリ内「情報を提供」フォームからの報告です。

      - store-id: store-001
      - 店名: テスト店
      - 住所: 東京都新宿区1-1-1
      - SNS ID: （未記入）
      - 確定可否: SNS ID未記入 → 未確認（みんなの報告）扱い
      - お礼リプライ: —

      ## 提案値一覧
      | 項目 | 提案値 |
      |------|--------|
      | フロア（イニブ） | 4F |"
    `)
  })
})
