import { config } from "dotenv";
import { DatabaseService } from "./db/database-sevice";
import { BotService } from "./services/BotService";

async function main() {
    try {
        // const stream$ = from([1, 2, 3, 4, 5]);
        // const slow$ = interval(900);
        // slow$.pipe(
        // ).subscribe((value) => console.log("Slow value:", value));
        // stream$.pipe(
        //     concatMap(value =>
        //         timer(1000).pipe(
        //             map((value) => value)
        //         ),
        //     ),
        //     tap(value => console.log("Value:", value))
        // ).subscribe()
        config();
        const db = DatabaseService.getInstance();
        db.init().subscribe();
        // db.demoWorkflow().subscribe();
        // db.demoWorkflow().subscribe();
        // console.log("Database initialized.");
        const bot = new BotService();
        await bot.start();
    } catch (err) {
        console.error("Error:", err);
    }
}

main();
