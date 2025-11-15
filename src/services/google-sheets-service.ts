import { readFileSync } from "fs";
import { google } from "googleapis";
import { drive_v3 } from "googleapis/build/src/apis/drive/v3";
import { sheets_v4 } from "googleapis/build/src/apis/sheets/v4";
import { concatMap, from, map, Observable, reduce, switchMap, tap } from "rxjs";
import { ISheetCommunicator } from "../models/ISheetCommunicator";
import { SpreadSheetDto } from "../models/spread-sheet-dto";

export class GoogleSheetsService implements ISheetCommunicator {

  private drive: drive_v3.Drive;
  private sheets: sheets_v4.Sheets;

  constructor(serviceAccountPath: string) {
    const credentials = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.readonly",
      ],
    });
    this.drive = new drive_v3.Drive({ auth });
    this.sheets = new sheets_v4.Sheets({ auth });
    console.log("GoogleSheetsService initialized.");
    // Initialization code here
  }
  getSheetById(sheetId: number): Observable<any> {
    throw new Error("Method not implemented.");
  }
  getSheetByTitle(title: string): Observable<any> {
    return new Observable<any>((subscriber) => {
      // Example implementation: Fetch sheet by title logic here
      subscriber.error(new Error("Method not implemented."));
    });
  }

  getSheetTitles(spreadsheetId: string): Observable<string[]> {
    return from(this.sheets.spreadsheets.get({ spreadsheetId })).pipe(
      map(response => {
        const titles = response.data.sheets?.map(sheet => sheet.properties?.title || "") || [];
        return titles;
      })
    );
  }

  public getSpreadsheetMeta(spreadsheetId: string): Observable<SpreadSheetDto> {
    return from(this.sheets.spreadsheets.get({ spreadsheetId })).pipe(
      map(response => {
        const speadSheet: SpreadSheetDto = {
          "spreadsheetId": response.data.spreadsheetId || "",
          "title": response.data.properties?.title || "",
          "sheets": response.data.sheets?.map(sheet => {
            return {
              "title": sheet.properties?.title || "",
              "sheetId": sheet.properties?.sheetId || 0,
              "data": [] as string[][]
            }
          }) || []
        }
        return speadSheet;
      }),
      tap(speadSheet => console.log(`Spreadsheet meta retrieved: ${speadSheet.title}`)),
      concatMap(speadSheet => {
        return from(speadSheet.sheets).pipe(
          concatMap(sheetMeta => {
            return from(
              this.sheets.spreadsheets.values.get({
                spreadsheetId,
                range: sheetMeta.title,
              })
            ).pipe(
              map(response => {
                sheetMeta.data = response.data.values || [];
                return sheetMeta;
              })
            );
          }),
          reduce((acc, sheetMeta) => {
            acc.sheets.push(sheetMeta);
            return acc;
          }, speadSheet)
        );
      })
    );
  }

  getSheetsByNames(spreadsheetId: string, titles: string[]): Observable<any[]> {
    return from(titles).pipe(
      concatMap(title => {
        return from(
          this.sheets.spreadsheets.values.get({
            spreadsheetId,
            range: title,
          })
        ).pipe(
          map(response => ({
            title,
            data: response.data.values || [],
          }))
        );
      }),
      // Collect all sheets into an array
      map(sheet => [sheet]),
      // Flatten the array of arrays
      switchMap(sheetsArray => from(sheetsArray).pipe(
        // Accumulate all sheets into a single array
      )),
      map(sheets => [sheets])

    );
  }

  async getLastModified(spreadsheetId: string) {
    const res = await this.drive.files.get({
      fileId: spreadsheetId,
      fields: "modifiedTime, name, owners/emailAddress",
    });
    return res.data;
  }
}