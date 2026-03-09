export type NativeImageExtractionResult = {
  anchored: Record<string, string>;
  unanchored: string[];
};

export type NativeSheetRow = {
  excelRow: number;
  values: any[];
};

export type NativeRowChunkResult = {
  rows: NativeSheetRow[];
  nextStartRow: number;
  done: boolean;
};
