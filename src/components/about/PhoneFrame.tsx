import type { AboutImage } from '@/lib/about-copy'

interface PhoneFrameProps {
  /** 枠の中に入れる実機スクリーンショット（375×812 の画面をそのまま撮ったもの）。 */
  image: AboutImage
  /** 初回表示に必要な画像なら true（`fetchPriority="high"`）。それ以外は遅延読み込み。 */
  priority?: boolean
  /** 外側の幅指定など（例 `max-w-[280px]`）。 */
  className?: string
}

/**
 * スクリーンショットをスマホ端末風に見せる枠（同期・presentational）。
 *
 * 画像そのものには端末枠を焼き込まず、CSS で濃いグレーのベゼルと角丸を付ける。
 * 画像を撮り直しても枠は変わらず、枠のデザイン変更も画像に触らずに済む。
 * 画像は寸法固定の静的 WebP を素の `<img>` で出す（`next/image` は使わずクライアント JS 非依存）。
 */
export function PhoneFrame({ image, priority = false, className }: PhoneFrameProps) {
  return (
    <div className={`mx-auto w-full ${className ?? ''}`}>
      <div className="rounded-[2.4rem] bg-gray-900 p-[9px] shadow-2xl ring-1 ring-black/10">
        <div className="overflow-hidden rounded-[1.9rem] bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element -- 寸法固定の静的WebP。next/image を使わずクライアントJS非依存にする */}
          <img
            src={image.src}
            width={image.width}
            height={image.height}
            alt={image.alt}
            className="block h-auto w-full"
            {...(priority ? { fetchPriority: 'high' as const } : { loading: 'lazy' as const })}
          />
        </div>
      </div>
    </div>
  )
}
