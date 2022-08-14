export class Transaction {
    from: string;
    to: string;
    value: number;
    timestamp: number;
    constructor (from: string, to: string, value: number, timestamp?: number) {
        this.from = from;
        this.to = to;
        this.value = value;
        this.timestamp = timestamp || Date.now();
    }
}