import { Observable } from "rxjs";
import { SpreadSheetDto } from "./spread-sheet-dto";

export interface ISheetCommunicator {
  getSheetTitles(spreadsheetId: string): Observable<string[]>;
  getSheetById(sheetId: number): Observable<any>;
  getSheetByTitle(title: string): Observable<any>;
  getSheetsByNames(spreadsheetId: string, titles: string[]): Observable<any[]>;
  getSpreadsheetMeta(spreadsheetId: string): Observable<SpreadSheetDto>;
}
