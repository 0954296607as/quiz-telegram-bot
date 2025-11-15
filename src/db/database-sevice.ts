import fs from 'fs';
import path from 'path';
import { catchError, concatMap, defer, from, map, Observable, of, shareReplay, tap, throwError } from 'rxjs';
import { open, Database as SQLiteDatabase } from 'sqlite';
import sqlite3 from 'sqlite3';

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
  public get<T extends Object>(sql: string,
    params: any[] = [],
    modelClass?: { new(...args: any[]): T; fromDto(dto: any): T }): Observable<T> {
    return this.db$.pipe(
      concatMap(db => from(db.get<T>(sql, params))),
      tap(row => console.log(`Get → ${sql}`, row)),
      map(row => {
        if (!row) {
          return Object.create(null) as T;
        }
        return modelClass?.fromDto ? modelClass.fromDto(row) : row;
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

}


