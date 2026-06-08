/**
 * 住所文字列の最小共通前処理。
 *
 * パイプラインの住所正規化（`scripts/merge.ts` の `normalizeAddress`）と
 * クライアントの住所パース（`src/lib/address-parser.ts` の `parseAddress`）の
 * 双方から参照し、前処理の齟齬（全角/半角・空白の揺れ）を防ぐ純関数。
 *
 * 処理内容:
 * - 全角英数字 → 半角
 * - 全角空白 → 半角空白
 * - 前後の空白除去・連続空白を1つへまとめる
 *
 * 番地表記（丁目/番/号・ハイフン）や建物名の扱いは目的別に異なるため、
 * ここでは扱わず各呼び出し側で行う。
 */
export function normalizeTextBasics(input: string): string {
  return input
    // 全角英数字（Ａ-Ｚ ａ-ｚ ０-９）→ 半角
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
    )
    // 全角空白 → 半角空白
    .replace(/　/g, ' ')
    // 連続空白を1つへ
    .replace(/ {2,}/g, ' ')
    // 前後の空白除去
    .trim()
}
