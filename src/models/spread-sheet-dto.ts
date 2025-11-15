export type SpreadSheetDto = {
  spreadsheetId: string;
  title: string;
  sheets: {
    title: string;
    sheetId: number;
    data: string[][]
  }[] ;
};
export type SheetDto = { title: string; sheetId: number; data: string[][]};