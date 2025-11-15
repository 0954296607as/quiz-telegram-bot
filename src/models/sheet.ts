import { BaseModel } from "./base-model";

export class Sheet extends BaseModel {
  public id!: number;
  public title!: string;
  public source_text!: string;
  public translated_text!: string;

  public toString(): string {
    return `SheetRecord { id: ${this.id}, title: ${this.title}, source: ${this.source_text} }`;
  }

  public updateTexts(sourceText: string, translatedText: string): void {
    this.source_text = sourceText;
    this.translated_text = translatedText;
  }



  static createFromAny(obj: any): Sheet | null {
    if (obj === null || obj === undefined || typeof obj !== 'object') {
      return null;
    }
    const sheet = new Sheet();
    sheet.id = obj.id ?? 0;
    sheet.title = obj.title ?? '';
    sheet.source_text = obj.source_text ?? '';
    sheet.translated_text = obj.translated_text ?? '';
    return sheet;
  }

  static createFromArray(arr: any[]): Sheet[] {
    return arr.map(item => Sheet.createFromAny(item)).filter(sheet => sheet !== null);
  }
}
