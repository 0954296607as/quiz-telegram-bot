import { concatMap, last, lastValueFrom, map, Observable, of, Subscription, switchMap, tap } from "rxjs";
import { Markup } from "telegraf";
import Context from "telegraf/typings/context";
import { QuestionsRepository } from "../db/questions-repository";
import { ISheetCommunicator } from "../models/ISheetCommunicator";
import { SpreadSheetDto } from "../models/spread-sheet-dto";
import { GoogleSheetsService } from "./google-sheets-service";
import { QuizManager } from "./quiz-meneger";
import { TelegramCommandHandler, TelegramEventService } from "./telegram-event-service";


export class BotService {
    private telegramEventService!: TelegramEventService;
    private commandListener: Subscription | null = null;
    private middlewareListener: Subscription | null = null;
    private messageListener: Subscription | null = null;
    private sheetService: ISheetCommunicator;
    private questionRepository: QuestionsRepository;
    private quizManager: QuizManager;

    constructor() {
        const token = process.env.BOT_TOKEN;
        if (!token) {
            throw new Error("BOT_TOKEN is empty in .env");
        }
        const creadentials = process.env.GOOGLE_CREDENTIALS_PATH;
        if (!creadentials) {
            throw new Error("GOOGLE_CREDENTIALS_PATH is empty in .env");
        }
        this.telegramEventService = new TelegramEventService(token);
        this.sheetService = new GoogleSheetsService(creadentials);
        this.questionRepository = new QuestionsRepository();
        this.quizManager = new QuizManager(this.questionRepository);
    }

    public async start(): Promise<void> {
        await this.telegramEventService.botLaunch();
        await lastValueFrom(this.questionRepository.init());
        this.startMiddlewareListener();
        this.startCommandsListener();
        this.startMessageListener();
    }

    private startCommandsListener(): void {
        if (this.commandListener) {
            console.log("Command listener is already running.");
            return;
        }
        this.commandListener = this.telegramEventService.command$.pipe(
            switchMap(({ ctx, command }: TelegramCommandHandler) =>
                this.handleCommand({ ctx, command }))
        ).subscribe();
    }

    private startMiddlewareListener(): void {
        if (this.middlewareListener) {
            console.log("Middleware listener is already running.");
            return;
        }
        this.middlewareListener = this.telegramEventService.middleware$.pipe(
            concatMap(({ ctx, userID }) => {
                if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
                    return of({ ctx, userID });
                }
                const topic = ctx.callbackQuery.data;
                return this.handleTopicSelection(ctx, topic);
            })
        ).subscribe();
    }

    private startMessageListener(): void {
        if (this.messageListener) {
            console.log("Message listener is already running.");
            return;
        }
        this.messageListener = this.telegramEventService.message$.pipe(
            switchMap(({ ctx, text }) => this.quizManager.handleAnswer$(ctx) as Observable<unknown>)
        ).subscribe();
    }

    public stop(): void {
        this.commandListener?.unsubscribe();
        this.middlewareListener?.unsubscribe();
        this.messageListener?.unsubscribe();
        console.log("Bot service stopped.");
    }

    private handleCommand(commandHandler: TelegramCommandHandler): Observable<boolean> {
        console.log(`Handling command: ${commandHandler.command}`);
        switch (commandHandler.command) {
            case '/start':
                // Handle start command
                return this.handleStartCommand();
            case '/update':
                // Handle topics command
                return this.handleUpdateCommand(commandHandler.ctx);
            case '/load_sheets':
                // Handle load_sheets command
                return this.handleLoadSheetsCommand();
            case '/next':
                // Handle next command
                return this.handleNextCommand();
            case '/topics':
                // Handle topics command
                return this.handleTopicsCommand(commandHandler.ctx);
            case '/help':
                // Handle help command
                return of(true);
            default:
                return this.handleUnknownCommand();
        }
    }

    private handleHelpCommand(): Observable<boolean> {
        console.log("Help command handled");
        return of(true);
    }

    private handleUpdateCommand(context: Context): Observable<boolean> {
        // Implementation of update command handling logic
        return this.sheetService.getSpreadsheetMeta(process.env.SPREADSHEET_ID || "").pipe(
            switchMap((meta) => {
                console.log("Spreadsheet Meta:", meta);
                return of(meta);
            }),
            concatMap((spreadSheetDto: SpreadSheetDto) => {
                // Here you can add logic to update the database with the new spreadsheet data
                return this.questionRepository.upsertSpreadsheet(spreadSheetDto).pipe(
                    map(() => spreadSheetDto)
                );
            }),
            concatMap((spreadSheetDto: SpreadSheetDto) => {
                // Additional processing if needed
                return of(spreadSheetDto);
            }),
            map(() => true),
            last(),
            tap(() => {
                console.log("Update command completed.");
                context.reply("Spreadsheet data has been updated successfully.");
            })
        );
    }

    private handleLoadSheetsCommand(): Observable<boolean> {
        console.log("Load Sheets command handled");
        return of(true);
        // Implementation of load sheets command handling logic
    }

    private handleNextCommand(): Observable<boolean> {
        console.log("Next command handled");
        return of(true);
        // Implementation of next command handling logic
    }

    private handleStartCommand(): Observable<boolean> {
        console.log("Start command handled");
        return of(true);
    }

    private handleTopicsCommand(context: Context): Observable<boolean> {
        console.log("Topics command handled");

        return this.questionRepository.getAllTopics().pipe(
            map((topics: Array<{ sheet_id: number, title: string }>) => {
                console.log("Available topics:", topics);
                const buttons = topics.map(topic => Markup.button.callback(topic.title, `${topic.sheet_id}`));
                context.reply('Available topics:', Markup.inlineKeyboard(buttons));
                return true;
            })
        );
    }

    private handleUnknownCommand(): Observable<boolean> {
        console.log("Unknown command handled");
        return of(true);
    }

    private handleTopicSelection(ctx: Context, topic: string): Observable<boolean> {
        console.log(`Topic selected: ${topic}`);
        return (this.quizManager.startTopic$(ctx, topic) as Observable<unknown>)
            .pipe(
                map(() => true)
            );

        // Implementation of topic selection handling logic
    }

}