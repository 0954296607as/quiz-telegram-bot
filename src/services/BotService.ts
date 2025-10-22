import { config } from "dotenv";
import { Context, Telegraf } from "telegraf";

config();

export class BotService {
    private bot: Telegraf<Context>;

    constructor() {
        const token = process.env.BOT_TOKEN;
        if (!token) {
            throw new Error("BOT_TOKEN is empty in .env");
        }
        this.bot = new Telegraf(token);
    }

    public async start(): Promise<void> {
        console.log("Starting bot...");

        //start command
        this.bot.start(async (ctx) => {
            const user = ctx.from?.first_name || "friend";
            console.log(`Hi ${user} has started the bot.`);
            console.log(ctx.from);
            await ctx.reply(`Hi, ${user}! I love you.`);
        });

        // Any other text message
        this.bot.on("text", async (ctx) => {
            await ctx.reply("only /start");
        });
        // Start (polling)
        await this.bot.launch();
        console.log("Lisening...");
    }

    public async stop(): Promise<void> {
        console.log("Spopping the bot...");
        await this.bot.stop();
    }
}