import nextConfig from 'eslint-config-next';
import jsxA11y from 'eslint-plugin-jsx-a11y';

// eslint-config-next は jsx-a11y/recommended のうち6ルールしか有効化しない（すべて warn）。
// 既存の水準に合わせ、フルセットの推奨ルールも error ではなく warn で追加する。
const jsxA11yWarn = Object.fromEntries(
  Object.entries(jsxA11y.flatConfigs.recommended.rules).map(([rule, severity]) => [
    rule,
    Array.isArray(severity) ? ['warn', ...severity.slice(1)] : severity === 'error' ? 'warn' : severity,
  ])
);

export default [
  ...nextConfig,
  // eslint-config-next が既に jsx-a11y プラグイン自体を登録済みのため、ここでは
  // ルールだけを追加する（plugins を再定義すると "Cannot redefine plugin" エラーになる）。
  { rules: jsxA11yWarn },
  {
    ignores: ['.next/**', 'node_modules/**'],
  },
];
