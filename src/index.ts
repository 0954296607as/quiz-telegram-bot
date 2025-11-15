import { config } from "dotenv";
import { DatabaseService } from "./db/database-sevice";
import { BotService } from "./services/BotService";

async function main() {
    try {
        config();
        const bot = new BotService();
        await bot.start();
    } catch (err) {
        console.error("Error:", err);
    }
}

main();
