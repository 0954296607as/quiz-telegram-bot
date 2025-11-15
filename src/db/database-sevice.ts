import fs from 'fs';
import path from 'path';
import { catchError, concatMap, defer, from, map, Observable, of, shareReplay, tap, throwError } from 'rxjs';
import { open, Database as SQLiteDatabase } from 'sqlite';
import sqlite3 from 'sqlite3';
import { Question } from '../models/question';
import { SpreadSheetDto } from '../models/spread-sheet-dto';

const DEFAULT_DB_PATH = ".data/quiz.db";

export class DatabaseService {
  private static instance: DatabaseService | null = null;
  private readonly db$: Observable<SQLiteDatabase>;

  private constructor(private readonly dbPath: string = DEFAULT_DB_PATH) {
    const fullPath = path.resolve(dbPath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created database directory: ${dir}`);
    }

    this.db$ = defer(() =>
      from(
        open({
          filename: fullPath,
          driver: sqlite3.Database,
        })
      )
    ).pipe(
      tap(() => console.log(`Conected to DB: ${fullPath}`)),
      shareReplay(1) // кешируем подключение — один экземпляр для всех подписчиков
    );
  }

  public static getInstance(dbPath: string = DEFAULT_DB_PATH): DatabaseService {
    if (!this.instance) {
      this.instance = new DatabaseService(dbPath);
    }
    return this.instance;
  }

  /**
   * (INSERT, UPDATE, DELETE)
   */
  public exec(sql: string, params: any[] = []): Observable<boolean> {
    return this.db$.pipe(
      concatMap(db => db.run(sql, params)),
      tap(() => console.log(`exec → ${sql}`)),
      map(() => true),
      catchError(err => {
        console.error(`exec error: ${err.message}`);
        return of(false);
      })
    );
  }

  /**
   * Get single row
  */
  public get<T = any>(sql: string, params: any[] = []): Observable<T> {
    return this.db$.pipe(
      concatMap(db => from(db.get<T>(sql, params))),
      tap(row => console.log(`Get → ${sql}`, row)),
      map(row => {
        if (!row) {
          return Object.create(null) as T;
        }
        return row;
      }),
      catchError(err => {
        console.error(`Get error: ${err.message}`);
        throw err;
      })
    );
  }

  /**
   * Get multiple rows
   */
  public all<T>(sql: string, params: any[] = []): Observable<T[]> {
    return this.db$.pipe(
      concatMap((db: SQLiteDatabase) => db.all<T[]>(sql, params)),
      tap((rows: T[]) => console.log(`all → ${sql}`, rows.length, 'rows')),
      catchError(err => {
        console.error(`All error: ${err.message}`);
        return throwError(() => err);
      })
    );
  }

  /**
   * Инициализация таблиц (выполняется один раз при старте)
   */
  public init(): Observable<void> {
    return this.createSpreadSheetTable().pipe(
      concatMap(() => this.createSheetTable()),
      concatMap(() => this.createSheetRowsTable()),
      map(() => {
        console.log('Database initialized.');
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
    return this.exec(sql)
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
    return this.exec(sql)
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
    return this.exec(sql)
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

  public upsertSpreadsheet(spreadSheetDto: SpreadSheetDto): Observable<boolean> {
    const insertSpreadsheetSql = `
      INSERT INTO spreadsheets (spreadsheet_id, title, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(spreadsheet_id) DO UPDATE SET
        title = excluded.title,
        updated_at = datetime('now');
    `;

    return this.exec(insertSpreadsheetSql, [spreadSheetDto.spreadsheetId, spreadSheetDto.title])
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
                return this.exec(insertSheetSql, [sheet.sheetId, sheet.title, spreadSheetDto.spreadsheetId])
                  .pipe(
                    concatMap(() => {
                      const getSheetIdSql = `
                        SELECT id FROM sheets
                        WHERE spreadsheet_id = ? AND sheet_id = ?;
                      `;
                      return this.get<{ id: number }>(getSheetIdSql, [spreadSheetDto.spreadsheetId, sheet.sheetId])
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
                                return this.exec(insertRowSql, [sheetFk, rowIndex, JSON.stringify(rowData)]);
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

  public getAllTopics(): Observable<Array<{ sheet_id: number, title: string }>> {
    const sql = `
      SELECT DISTINCT sheet_id, title FROM sheets
      WHERE title IS NOT NULL;
    `;
    return this.all<{ sheet_id: number, title: string }>(sql).pipe(
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
    return this.get<Question>(sql, [sheetId]).pipe(
      map(row => {
        if (Object.keys(row).length === 0) {
          return undefined;
        }
        row.row_data = JSON.parse(row.row_data as unknown as string) || new Array<string>(2).fill('');
        return row;
      })
    );
  }

}


