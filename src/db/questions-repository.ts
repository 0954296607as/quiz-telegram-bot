import { concatMap, from, map, Observable, tap } from "rxjs";
import { Question } from "../models/question";
import { SpreadSheetDto } from "../models/spread-sheet-dto";
import { DatabaseService } from "./database-sevice";

export class QuestionsRepository {
  private dbservice: DatabaseService;

  constructor() {
    this.dbservice = DatabaseService.getInstance();
  }

  public init(): Observable<void> {
    return this.createSpreadSheetTable().pipe(
      concatMap(() => this.createSheetTable()),
      concatMap(() => this.createSheetRowsTable()),
      map(() => {
        console.log('Database initialized.');
      })
    );
  }

  public getAllTopics(): Observable<Array<{ sheet_id: number, title: string }>> {
    const sql = `
      SELECT DISTINCT sheet_id, title FROM sheets
      WHERE title IS NOT NULL;
    `;
    return this.dbservice.all<{ sheet_id: number, title: string }>(sql).pipe(
      map(rows =>
        rows.map(row => ({ sheet_id: row.sheet_id, title: row.title }))),

    );
  }

  public getNextQuestion(sheetId: number): Observable<Question | undefined> {
    const sql = `SELECT sr.*
        FROM sheet_rows AS sr
        JOIN sheets AS s ON sr.sheet_fk = s.id
        WHERE s.sheet_id = ?
        ORDER BY RANDOM()
        LIMIT 1;`;
    return this.dbservice.get<Question>(sql, [sheetId], Question).pipe(
      map((question: Question) => {
        if (!question) {
          return undefined;
        }
        return question;
      })
    );
  }

  public upsertSpreadsheet(spreadSheetDto: SpreadSheetDto): Observable<boolean> {
    const insertSpreadsheetSql = `
        INSERT INTO spreadsheets (spreadsheet_id, title, updated_at)
        VALUES (?, ?, datetime('now'))
        ON CONFLICT(spreadsheet_id) DO UPDATE SET
          title = excluded.title,
          updated_at = datetime('now');
      `;

    return this.dbservice.exec(insertSpreadsheetSql, [spreadSheetDto.spreadsheetId, spreadSheetDto.title])
      .pipe(
        concatMap(() => {
          return from(spreadSheetDto.sheets)
            .pipe(
              concatMap(sheet => {
                const insertSheetSql = `
                    INSERT INTO sheets (sheet_id, title, spreadsheet_id, updated_at)
                    VALUES (?, ?, ?, datetime('now'))
                    ON CONFLICT(spreadsheet_id, sheet_id) DO UPDATE SET
                    title = excluded.title,
                    updated_at = datetime('now');
                  `;
                return this.dbservice.exec(insertSheetSql, [sheet.sheetId, sheet.title, spreadSheetDto.spreadsheetId])
                  .pipe(
                    concatMap(() => {
                      const getSheetIdSql = `
                          SELECT id FROM sheets
                          WHERE spreadsheet_id = ? AND sheet_id = ?;
                        `;
                      return this.dbservice.get<{ id: number }>(getSheetIdSql, [spreadSheetDto.spreadsheetId, sheet.sheetId])
                        .pipe(
                          concatMap(row => {
                            const sheetFk = row.id;
                            return from(sheet.data).pipe(
                              concatMap((rowData, rowIndex) => {
                                const insertRowSql = `
                                    INSERT INTO sheet_rows (sheet_fk, row_index, row_data, updated_at)
                                    VALUES (?, ?, ?, datetime('now'))
                                    ON CONFLICT(sheet_fk, row_index) DO UPDATE SET
                                    row_data = excluded.row_data,
                                    updated_at = datetime('now');
                                  `;
                                return this.dbservice.exec(insertRowSql, [sheetFk, rowIndex, JSON.stringify(rowData)]);
                              })
                            );
                          })
                        );
                    })
                  );
              }),
              map(() => true)
            );
        })
      );
  }

  private createSpreadSheetTable(): Observable<boolean> {
    const sql = `
        CREATE TABLE IF NOT EXISTS spreadsheets (
          spreadsheet_id TEXT PRIMARY KEY,
          title TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT (datetime('now'))
        );`
    return this.dbservice.exec(sql)
      .pipe(
        tap((success) => {
          if (!success) {
            console.error(`Failed to create table for spreadsheets.`);
            return;
          }
          console.log(`Table for spreadsheets created.`);
        })
      );
  }

  private createSheetTable(): Observable<boolean> {
    const sql = `
      CREATE TABLE IF NOT EXISTS sheets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sheet_id INTEGER NOT NULL,
        title TEXT,
        spreadsheet_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT (datetime('now')),
        UNIQUE (spreadsheet_id, sheet_id),
        FOREIGN KEY (spreadsheet_id) REFERENCES spreadsheets(spreadsheet_id) ON DELETE CASCADE
      );`
    return this.dbservice.exec(sql)
      .pipe(
        tap((success) => {
          if (!success) {
            console.error(`Failed to create table for sheets.`);
            return;
          }
          console.log(`Table for sheets created.`);
        })
      );
  }

  private createSheetRowsTable(): Observable<boolean> {
    const sql = `
      CREATE TABLE IF NOT EXISTS sheet_rows (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sheet_fk INTEGER NOT NULL,
        row_index INTEGER NOT NULL,
        row_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (id) REFERENCES sheets(id) ON DELETE CASCADE,
        UNIQUE (sheet_fk, row_index)
      );`
    return this.dbservice.exec(sql)
      .pipe(
        tap((success) => {
          if (!success) {
            console.error(`Failed to create table for sheet_rows".`);
            return;
          }
          console.log(`Table for sheet_rows created.`);
        })
      );
  }

}