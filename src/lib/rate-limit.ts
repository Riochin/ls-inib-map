import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// env 未設定時は null → レート制限チェックをスキップ（グレースフル劣化）
export const ratelimit = process.env.UPSTASH_REDIS_REST_URL
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, '10 m'),
      prefix: 'report',
    })
  : null

export function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
}
