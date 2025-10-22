import { config } from "dotenv";
import { TelegramEventService } from "./telegram-event-service";

config();

export class BotService {
    private telegramEventService!: TelegramEventService;

    constructor() {
        const token = process.env.BOT_TOKEN;
        if (!token) {
            throw new Error("BOT_TOKEN is empty in .env");
        }
        this.telegramEventService = new TelegramEventService(token);
    }

    public async start(): Promise<void> {
        await this.telegramEventService.botLaunch();

        this.telegramEventService.message$.subscribe(({ ctx, text }) => {
            console.log(`Received message: ${text} from ${ctx.from?.first_name}`);
            ctx.reply(`You said: ${text}`);
        });

        this.telegramEventService.command$.subscribe(({ ctx, command }) => {
            console.log(`Received command: ${command} from ${ctx.from?.first_name}`);
            ctx.reply(`Command received: ${command}`);
        });
    }
}