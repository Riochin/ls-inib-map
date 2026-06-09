import { describe, it, expect } from 'vitest'
import {
  extractDetailIds,
  parsePairDetail,
  inferYear,
  buildIsoDates,
  mergePairSchedule,
  hasMeaningfulDiff,
  scrapePairSchedule,
  INFO_LIST_URL,
  buildDetailUrl,
} from '../scrape-pair-schedule'
import type { PairScheduleFile, PairScheduleMonth } from '@/types/pair-schedule'

const FETCHED_AT = '2026-06-09T00:00:00.000Z'

/** 実構造（class="itag itag02"＋掲載日 / div.h3 h3 / div.txarea info）に倣った詳細HTMLを組み立てる */
function detailHtml(opts: { title: string; posted: string; dateLines: string[] }): string {
  const lines = opts.dateLines.map((d) => `・${d}<br />`).join('\r\n')
  return `<!doctype html><html><body>
    <div class="detail">
      <span class="itag itag02">お知らせ</span>${opts.posted}  </div>
      <div class="h3">
      <h3>${opts.title}</h3>
      </div>
      <div class="bl">
        <div class="txarea info">
          <img src="https://example.com/x.png"><br />${opts.title}をお知らせします。<br /><br />【開催日程】<br />${lines}
        </div>
      </div>
    </div>
  </body></html>`
}

describe('extractDetailIds', () => {
  it('詳細リンクのIDを順序保持・重複排除で抽出する', () => {
    const html = `
      <li><a href="https://jojols-w.bn-am.net/web/info/detail/AAA111"><img></a></li>
      <li><a href="https://jojols-w.bn-am.net/web/info/detail/BBB222"><img></a></li>
      <li><a href="https://jojols-w.bn-am.net/web/info/detail/AAA111"><img></a></li>
      <li><a href="https://bandainamco-am.co.jp/other">外部</a></li>
    `
    expect(extractDetailIds(html)).toEqual(['AAA111', 'BBB222'])
  })

  it('詳細リンクが無ければ空配列', () => {
    expect(extractDetailIds('<html><body>no links</body></html>')).toEqual([])
  })
})

describe('parsePairDetail', () => {
  it('ペア戦告知をパースして月・開催日・掲載日を返す', () => {
    const html = detailHtml({
      title: '5月のペア戦開催日程',
      posted: '2026年04月15日(水)',
      dateLines: ['5月1日(金) 12:00～', '5月2日(土) 12:00～', '5月11日(月) 12:00～'],
    })
    const url = buildDetailUrl('XYZ')
    const result = parsePairDetail(html, url, FETCHED_AT)
    expect(result).toEqual<PairScheduleMonth>({
      year: 2026,
      month: 5,
      pairDates: ['2026-05-01', '2026-05-02', '2026-05-11'],
      sourceUrl: url,
      postedAt: '2026-04-15',
      fetchedAt: FETCHED_AT,
    })
  })

  it('ペア戦以外のタイトルは null', () => {
    const html = detailHtml({
      title: 'シーズン27 開幕のお知らせ',
      posted: '2026年05月30日(土)',
      dateLines: ['5月1日(金) 12:00～'],
    })
    expect(parsePairDetail(html, buildDetailUrl('N'), FETCHED_AT)).toBeNull()
  })

  it('タイトル月と異なる月の日付行は採用しない', () => {
    const html = detailHtml({
      title: '5月のペア戦開催日程',
      posted: '2026年04月15日(水)',
      // 4月や6月の混入行を混ぜる
      dateLines: ['4月30日(木) 12:00～', '5月1日(金) 12:00～', '6月1日(月) 12:00～'],
    })
    const result = parsePairDetail(html, buildDetailUrl('M'), FETCHED_AT)
    expect(result?.pairDates).toEqual(['2026-05-01'])
  })

  it('日付行が一つも無ければ null', () => {
    const html = detailHtml({ title: '6月のペア戦開催日程', posted: '2026年05月13日(水)', dateLines: [] })
    expect(parsePairDetail(html, buildDetailUrl('E'), FETCHED_AT)).toBeNull()
  })
})

describe('inferYear', () => {
  it('翌月告知は掲載年のまま', () => {
    expect(inferYear(5, 2026, 4)).toBe(2026)
  })
  it('同月告知は掲載年のまま', () => {
    expect(inferYear(12, 2026, 12)).toBe(2026)
  })
  it('12月掲載の1月号は翌年', () => {
    expect(inferYear(1, 2026, 12)).toBe(2027)
  })
})

describe('buildIsoDates', () => {
  it('ゼロ埋め・昇順・重複排除する', () => {
    expect(buildIsoDates(2026, 5, [11, 1, 2, 1])).toEqual(['2026-05-01', '2026-05-02', '2026-05-11'])
  })
})

describe('mergePairSchedule', () => {
  const may: PairScheduleMonth = {
    year: 2026, month: 5, pairDates: ['2026-05-01'], sourceUrl: 'u5', postedAt: '2026-04-15', fetchedAt: 'f1',
  }
  const juneOld: PairScheduleMonth = {
    year: 2026, month: 6, pairDates: ['2026-06-01'], sourceUrl: 'u6', postedAt: '2026-05-13', fetchedAt: 'f1',
  }
  const juneNew: PairScheduleMonth = {
    year: 2026, month: 6, pairDates: ['2026-06-01', '2026-06-02'], sourceUrl: 'u6', postedAt: '2026-05-13', fetchedAt: 'f2',
  }

  it('同一月は新しい取得で置き換え、過去月は保持し (year,month) 昇順', () => {
    const merged = mergePairSchedule([may, juneOld], [juneNew])
    expect(merged).toEqual([may, juneNew])
  })

  it('年跨ぎも昇順に並ぶ', () => {
    const jan2027: PairScheduleMonth = {
      year: 2027, month: 1, pairDates: [], sourceUrl: 'u', postedAt: '2026-12-10', fetchedAt: 'f',
    }
    const merged = mergePairSchedule([jan2027], [may])
    expect(merged.map((m) => `${m.year}-${m.month}`)).toEqual(['2026-5', '2027-1'])
  })
})

describe('hasMeaningfulDiff', () => {
  const base: PairScheduleFile = {
    updatedAt: '2026-06-09T00:00:00Z',
    months: [{ year: 2026, month: 6, pairDates: ['2026-06-02'], sourceUrl: 'u', postedAt: '2026-05-13', fetchedAt: 'f1' }],
  }

  it('現行が無ければ常に差分あり', () => {
    expect(hasMeaningfulDiff(null, base)).toBe(true)
  })

  it('updatedAt と fetchedAt だけの違いは差分なし', () => {
    const next: PairScheduleFile = {
      updatedAt: '2026-06-16T00:00:00Z',
      months: [{ ...base.months[0], fetchedAt: 'f2' }],
    }
    expect(hasMeaningfulDiff(base, next)).toBe(false)
  })

  it('開催日の変化は差分あり', () => {
    const next: PairScheduleFile = {
      updatedAt: base.updatedAt,
      months: [{ ...base.months[0], pairDates: ['2026-06-02', '2026-06-04'] }],
    }
    expect(hasMeaningfulDiff(base, next)).toBe(true)
  })
})

describe('scrapePairSchedule', () => {
  const listHtml = `
    <a href="https://jojols-w.bn-am.net/web/info/detail/PAIR5"><img></a>
    <a href="https://jojols-w.bn-am.net/web/info/detail/NEWS1"><img></a>
    <a href="https://jojols-w.bn-am.net/web/info/detail/PAIR6"><img></a>
  `
  const details: Record<string, string> = {
    [buildDetailUrl('PAIR5')]: detailHtml({
      title: '5月のペア戦開催日程', posted: '2026年04月15日(水)', dateLines: ['5月1日(金) 12:00～'],
    }),
    [buildDetailUrl('NEWS1')]: detailHtml({
      title: 'シーズン27 開幕のお知らせ', posted: '2026年05月30日(土)', dateLines: [],
    }),
    [buildDetailUrl('PAIR6')]: detailHtml({
      title: '6月のペア戦開催日程', posted: '2026年05月13日(水)', dateLines: ['6月2日(火) 12:00～', '6月6日(土) 12:00～'],
    }),
  }

  const noSleep = () => Promise.resolve()

  it('ペア戦告知のみを抽出し、非ペア戦はスキップする', async () => {
    const fetcher = async (url: string) => {
      if (url === INFO_LIST_URL) return listHtml
      return details[url]
    }
    const months = await scrapePairSchedule({ fetcher, sleep: noSleep, fetchedAt: FETCHED_AT, log: () => {} })
    expect(months.map((m) => `${m.year}-${m.month}`)).toEqual(['2026-5', '2026-6'])
    expect(months[1].pairDates).toEqual(['2026-06-02', '2026-06-06'])
  })

  it('詳細1件の取得失敗は握りつぶして他は継続する', async () => {
    const fetcher = async (url: string) => {
      if (url === INFO_LIST_URL) return listHtml
      if (url === buildDetailUrl('PAIR5')) throw new Error('boom')
      return details[url]
    }
    const months = await scrapePairSchedule({ fetcher, sleep: noSleep, fetchedAt: FETCHED_AT, log: () => {} })
    expect(months.map((m) => m.month)).toEqual([6])
  })

  it('一覧取得自体の失敗は例外として伝播する', async () => {
    const fetcher = async () => { throw new Error('list down') }
    await expect(
      scrapePairSchedule({ fetcher, sleep: noSleep, fetchedAt: FETCHED_AT, log: () => {} }),
    ).rejects.toThrow('list down')
  })

  it('番兵ガード: IDは取れたがペア戦0件なら例外で中断する', async () => {
    const onlyNews = `<a href="https://jojols-w.bn-am.net/web/info/detail/NEWS1"><img></a>`
    const fetcher = async (url: string) => {
      if (url === INFO_LIST_URL) return onlyNews
      return details[buildDetailUrl('NEWS1')]
    }
    await expect(
      scrapePairSchedule({ fetcher, sleep: noSleep, fetchedAt: FETCHED_AT, log: () => {} }),
    ).rejects.toThrow(/構造が変化/)
  })
})
