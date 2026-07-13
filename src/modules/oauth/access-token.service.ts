import { createAccessToken } from "../../shared/id.js";

export class AccessTokenService {
  private readonly expirations = new Map<string, number>();

  constructor(private readonly now: () => number = Date.now) {}

  issue(expiresInSeconds: number): string {
    const token = createAccessToken();
    this.expirations.set(token, this.now() + expiresInSeconds * 1000);
    return token;
  }

  isValid(token: string): boolean {
    const expiresAt = this.expirations.get(token);
    if (expiresAt === undefined || expiresAt <= this.now()) {
      this.expirations.delete(token);
      return false;
    }

    return true;
  }
}
