import { fromEventPattern, Observable } from "rxjs";
import { Context, Telegraf } from "telegraf";
import { message } from "telegraf/filters";

export class TelegramEventService {
  private bot: Telegraf<Context>;
  private isRunning: boolean = false;
  public message$!: Observable<{ ctx: Context; text: string }>;
  public command$!: Observable<{ ctx: Context; command: string }>;
  public middleware$!: Observable<{ ctx: Context, userID: number }>;

  constructor(token: string) {
    this.bot = new Telegraf<Context>(token);;
    this.registerHandlers();
  }

  public registerHandlers(): void {
    this.message$ = fromEventPattern<{ ctx: Context; text: string }>(
      (handler) => {
        this.bot.on(message("text"), (ctx) => {
          handler({ ctx, text: ctx.message.text });
        });
      }
    );

    // REGEX to match any command /.*/
    this.command$ = fromEventPattern<{ ctx: Context; command: string }>(
      (handler) => {
        this.bot.command(/.*/, (ctx) => {
          handler({ ctx, command: ctx.message.text });
        });
      });

    this.middleware$ = fromEventPattern<{ ctx: Context, userID: number }>(
      (handler) => {
        this.bot.use((ctx, next) => {
          handler({ ctx, userID: ctx.from?.id || 0 });
          return next();
        });
      }
    );
  }

  public async botLaunch() {
    if (this.isRunning) {
      console.log("The bot is running.");
      return;
    }
    try {
      const me = await this.bot.telegram.getMe();
      console.log(`Autorization like @${me.username}`);

      this.bot.launch()
        .catch(err => console.error("Polling error:", err));
      this.isRunning = true;
      console.log("The bot is starting.");
    } catch (err) {
      console.error("Error of the Lounch", err);
    }

    process.once("SIGINT", () => {
      console.log("SIGINT: Stopping the bot");
      this.bot.stop("SIGINT");
    });
    process.once("SIGTERM", () => {
      console.log("SIGTERM: Stopping the bot");
      this.bot.stop("SIGTERM");
    });
  }
}
