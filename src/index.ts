import { BotService } from "./services/BotService";

async function main() {
    try {
        const bot = new BotService();
        await bot.start();
    } catch (err) {
        console.error("Ошибка при запуске:", err);
    }
}

main();
