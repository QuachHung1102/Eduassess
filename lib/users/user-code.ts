export type FormatUserCodeInput = {
  prefix: string;
  includeYear: boolean;
  padWidth: number;
  year: number;
  seq: number;
};

/** Ghép mã định danh từ thành phần. Pure — không DB. */
export function formatUserCode({ prefix, includeYear, padWidth, year, seq }: FormatUserCodeInput): string {
  const num = String(seq).padStart(Math.max(padWidth, 0), "0");
  return includeYear ? `${prefix}-${year}-${num}` : `${prefix}-${num}`;
}
