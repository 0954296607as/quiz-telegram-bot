import { delay, of, tap } from 'rxjs';
import { Context } from 'telegraf';
import { QuestionsRepository } from '../db/questions-repository';
import { Question } from '../models/question';

interface UserState {
  sheetId?: number;
  currentQuestion?: Question;
}

export class QuizManager {
  private repo = new QuestionsRepository();
  private users = new Map<number, UserState>();

  constructor(questionRepository: QuestionsRepository) {
    this.repo = questionRepository;
  }

  public startTopic$(ctx: Context, topic: string) {
    const userId = ctx.from?.id;
    if (!userId) return of(null);
    const sheetId = ctx.callbackQuery
      && 'data' in ctx.callbackQuery ? Number(ctx.callbackQuery.data) : 0;

    return this.repo.getNextQuestion(sheetId).pipe(
      tap((question: Question | undefined) => {
        if (!question) {
          this.sendMessage(ctx, `🎯 Thema: <b>${topic}</b>`);
          return;
        }
        this.users.set(userId, { sheetId, currentQuestion: question });
        this.sendMessage(ctx, `🧩: ${question!.parseQuestion()}`);
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
    if (!state || !state.currentQuestion || !state.currentQuestion.question) {
      this.sendMessage(ctx, '❗ Keine Frage ausgewählt. Bitte wähle ein Thema: /topics');
      return of(null);
    }
    const rightAnswer = state.currentQuestion.answer || '';
    const userAnswer = ctx.message && 'text' in ctx.message ? ctx.message.text.trim() : '';
    const correct = userAnswer.toLowerCase() === rightAnswer.toLowerCase();
    this.sendMessage(ctx, correct ? '✅ Richtig!' : `❌ ${state.currentQuestion.answer}`)
    // загружаем следующий вопрос
    return this.repo.getNextQuestion(state.sheetId!).pipe(
      delay(300),
      tap((nextQuestion: Question | undefined) => {
        if (nextQuestion) {
          this.users.set(userId, { sheetId: state.sheetId ?? 0, currentQuestion: nextQuestion });
          this.sendMessage(ctx, `🧩: ${nextQuestion!.parseQuestion()}`);
        } else {
          this.sendMessage(ctx, '🎉 Du hast alle Fragen in diesem Thema beantwortet!');
        }
      })
    );
  }

  private sendMessage(ctx: Context, message: string) {
    ctx.reply(message, { parse_mode: 'HTML' });
  }
}
