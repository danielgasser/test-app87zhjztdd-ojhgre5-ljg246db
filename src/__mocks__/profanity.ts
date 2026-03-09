export class ProfanityOptions {
    wholeWord = false;
}

export class Profanity {
    constructor(_options?: ProfanityOptions) { }
    exists(_text: string): boolean {
        return false;
    }
}