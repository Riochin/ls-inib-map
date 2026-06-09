import type { PairScheduleFile } from '@/types/pair-schedule'
import pairScheduleFile from './pair-schedule.json'

/**
 * 生成物 `pair-schedule.json` を読み込み型付けして re-export する薄いローダ。
 *
 * - データは週次のスクレイパ（`scripts/scrape-pair-schedule.ts`）が生成し、アプリ側は
 *   read-only で参照する（書き込みなし）。
 * - ビルド時にバンドルされ CDN エッジ配信される静的データ構成を `stores.json` と揃える。
 */
export const pairSchedule = pairScheduleFile as PairScheduleFile
