import { config } from "dotenv";
import { Subscription } from "rxjs";
import { TelegramEventService } from "./telegram-event-service";

config();

export class BotService {
    private telegramEventService!: TelegramEventService;
    private commandListener: Subscription | null = null;
    private middlewareListener: Subscription | null = null;
    private messageListener: Subscription | null = null;

    constructor() {
        const token = process.env.BOT_TOKEN;
        if (!token) {
            throw new Error("BOT_TOKEN is empty in .env");
        }
        this.telegramEventService = new TelegramEventService(token);
    }

    public async start(): Promise<void> {
        await this.telegramEventService.botLaunch();
        this.startMiddlewareListener();
        this.startCommandsListener();
        this.startMessageListener();
    }

    private startCommandsListener(): void {
        if (this.commandListener) {
            console.log("Command listener is already running.");
            return;
        }

        this.commandListener = this.telegramEventService.command$.subscribe(({ ctx, command }) => {
            console.log(`Received command: ${command} from ${ctx.from?.first_name}`);
            ctx.reply(`Command received: ${command}`);
        });
    }

    private startMiddlewareListener(): void {
        if (this.middlewareListener) {
            console.log("Middleware listener is already running.");
            return;
        }
        this.middlewareListener = this.telegramEventService.middleware$.subscribe(({ ctx, userID }) => {
            console.log(`Middleware triggered for user ID: ${userID}`);
        });
    }

    private startMessageListener(): void {
        if (this.messageListener) {
            console.log("Message listener is already running.");
            return;
        }
        this.messageListener = this.telegramEventService.message$.subscribe(({ ctx, text }) => {
            console.log(`Received message: ${text} from ${ctx.from?.first_name}`);
            ctx.reply(`You said: ${text}`);
        });
    }

    public stop(): void {
        this.commandListener?.unsubscribe();
        this.middlewareListener?.unsubscribe();
        this.messageListener?.unsubscribe();
        console.log("Bot service stopped.");
    }

}