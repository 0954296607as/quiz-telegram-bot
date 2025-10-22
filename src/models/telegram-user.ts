import { BaseModel } from "./base-model";

export class TelegramUser extends BaseModel {
  public id!: number;
  public is_bot!: boolean;
  public first_name!: string;
  public last_name?: string = "";
  public username?: string = "";
  public language_code?: string = "";

  public toString(): string {
    return `TelegramUser: ${this.id} - ${this.first_name} ${this.last_name || ""} (@${this.username || "no-username"})`;
  }

}