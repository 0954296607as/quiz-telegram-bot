import { of, tap, timeout } from 'rxjs';
import { Context } from 'telegraf';
import { DatabaseService } from '../db/database-sevice';
import { Question } from '../models/question';

interface UserState {
  sheetId?: number;
  currentQuestion?: Question;
}

export class QuizManager {
  private repo = DatabaseService.getInstance();
  private users = new Map<number, UserState>();


  public startTopic$(ctx: Context, topic: string) {
    const userId = ctx.from?.id;
    if (!userId) return of(null);
    const sheetId = ctx.callbackQuery
      && 'data' in ctx.callbackQuery ? Number(ctx.callbackQuery.data) : 0;

    return this.repo.getNextQuestion(sheetId).pipe(
      tap((question: Question | undefined) => {
        if (!question) {
          ctx.reply(`⚠️ "${topic}"`);
          return;
        }
        this.users.set(userId, { sheetId, currentQuestion: question });
        ctx.reply(`🧩: ${question.row_data[0]}`);
      })
    );
  }

  /**
   * Проверка ответа пользователя
   */
  public handleAnswer$(ctx: Context) {
    const userId = ctx.from?.id;
    if (!userId) return of(null);

    const state = this.users.get(userId);
    if (!state || !state.currentQuestion || !state.currentQuestion.row_data) {
      ctx.reply('❗ Сначала выберите тему: /topics');
      return of(null);
    }
    const rightAnswer = state.currentQuestion.row_data[1] || '';
    const userAnswer = ctx.message && 'text' in ctx.message ? ctx.message.text.trim() : '';
    const correct = userAnswer.toLowerCase() === rightAnswer.toLowerCase();

    ctx.reply(correct ? '✅' : `❌ ${state.currentQuestion.row_data?.[1]}`);

    // загружаем следующий вопрос
    return this.repo.getNextQuestion(state.sheetId!).pipe(
      timeout(500),
      tap(nextQuestion => {
        if (nextQuestion) {
          this.users.set(userId, { sheetId: state.sheetId ?? 0, currentQuestion: nextQuestion });
          ctx.reply(`🧩 ${nextQuestion.row_data[0]}`);
        } else {
          ctx.reply('🏁');
        }
      })
    );
  }
}
