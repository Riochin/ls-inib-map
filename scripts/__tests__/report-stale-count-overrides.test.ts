import { describe, it, expect } from 'vitest'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { formatStaleCountOverrides, writeStaleOutput } from '../report-stale-count-overrides'

const stale = [
  { id: 'a', name: '店A', game: 'jojo-ls' as const, baseline: 5, official: 2, override: 4 },
  { id: 'c', name: '店C', game: 'gundam-exvs' as const, baseline: 4, official: 0, override: 2 },
]

describe('formatStaleCountOverrides', () => {
  it('0件なら何も出さない', () => {
    expect(formatStaleCountOverrides([])).toBe('')
  })

  it('件数の見出しと、店ごとの行を出す（公式に台数が無ければ「台数なし」）', () => {
    const md = formatStaleCountOverrides(stale)
    expect(md).toContain('使われない台数の上書き（2件）')
    expect(md).toContain('| 店A（`a`） | ラスサバ | 5台 | 2台 | 4台 |')
    expect(md).toContain('| 店C（`c`） | イニブ | 4台 | 台数なし | 2台 |')
  })
})

describe('writeStaleOutput', () => {
  it('件数と複数行の Markdown をステップ出力に書く', () => {
    const out = path.join(mkdtempSync(path.join(tmpdir(), 'stale-')), 'output')
    writeStaleOutput(stale, out)
    const text = readFileSync(out, 'utf-8')
    expect(text).toMatch(/^stale_count=2\n/)
    expect(text).toMatch(/stale_count_overrides<<(\S+)\n[\s\S]*店A[\s\S]*\n\1\n$/)
  })

  it('GITHUB_OUTPUT が無ければ何もしない', () => {
    expect(() => writeStaleOutput(stale, undefined)).not.toThrow()
  })
})
