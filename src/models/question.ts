import { BaseModel } from "./base-model";

export class Question extends BaseModel {
  id?: number;
  sheetFk?: number;
  rowIndex?: number;
  question?: string;
  answer?: string
  createdAt: Date | undefined;
  updatedAt: Date | undefined;


  public toString(): string {
    return `Q: ${this.question} A: ${this.answer}`;
  }

  public static fromDto(dto: any): Question {
    const q = new Question();
    q.id = dto.id;
    q.sheetFk = dto.sheet_fk;
    const parsedRow = Question.safeParseRowData(dto.row_data);
    q.question = parsedRow[0];
    q.answer = parsedRow[1];
    q.rowIndex = dto.row_index;
    q.createdAt = dto.created_at ? new Date(dto.created_at) : undefined;
    q.updatedAt = dto.updated_at ? new Date(dto.updated_at) : undefined;
    return q;
  }

  private static safeParseRowData(value: any): [string, string] {
    if (!value) return ['', ''];

    try {
      const arr = typeof value === 'string' ? JSON.parse(value) : value;

      if (Array.isArray(arr) && arr.length >= 2) {
        return [arr[0] ?? '', arr[1] ?? ''];
      }

      console.warn('Question.fromDto: row_data exists but is not valid array', value);
      return ['', ''];

    } catch (e) {
      console.warn('Question.fromDto: failed to JSON.parse row_data:', e);
      return ['', ''];
    }
  }

}

