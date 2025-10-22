export abstract class BaseModel {

  constructor() {
  }

  public static createFromAnyArray<T extends object>(obj: any[]): T[] {
    if (!Array.isArray(obj)) {
      return [];
    }
    return obj.map((model: Partial<T>) => BaseModel.createFromAny<T>(this as unknown as new () => T, model));
  }

  static createFromAny<T extends object>(ctor: new () => T, other: Partial<T>): T {
    return Object.assign(new ctor(), other) as T;
  }

  public abstract toString(): string;

}
