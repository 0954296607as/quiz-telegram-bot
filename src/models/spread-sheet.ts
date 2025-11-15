import { BaseModel } from "./base-model";
import { Sheet } from "./sheet";

export class SpeadSheet extends BaseModel {

  spreadsheetId: string;
  title: string;
  sheets: Sheet[] = [];

  constructor(spreadsheetId: string, title: string, sheets: Sheet[] = []) {
    super();
    this.spreadsheetId = spreadsheetId;
    this.title = title;
  }

  public toString(): string {

    return `SpeadSheet { spreadsheetId: ${this.spreadsheetId}, title: ${this.title} }`
      + this.sheets.map(sheet => `\n  ${sheet.toString()}`)
        .join('');
  }

  static createFromAny(obj: any): SpeadSheet | null {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
      return null;
    }
    const speadSheet = new SpeadSheet(
      obj.spreadsheetId ?? '',
      obj.title ?? '',
      obj.sheets ? Sheet.createFromArray(obj.sheets) : []
    );
    return speadSheet;
  }

  static createFromArray(arr: any[]): Sheet[] {
    return arr.map(item => Sheet.createFromAny(item)).filter(sheet => sheet !== null);
  }

}