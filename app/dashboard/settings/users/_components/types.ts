export type ImportErrorRow = {
  row: number;
  nama: string;
  error: string;
};

export type ImportSummary = {
  total: number;
  valid: number;
  invalid: number;
  imported: number;
  failed: number;
};
