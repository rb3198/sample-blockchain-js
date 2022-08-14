import { Transaction } from "./Transaction";
import { SHA256 } from "crypto-js";

export class Block {
    prevHash: string;
    transactions: Transaction[];
    hash: string;
    timestamp: number;
    nonce: number;

    constructor (prevHash: string, timestamp: number, transactions: Transaction[]) {
        this.prevHash = prevHash;
        this.transactions = transactions;
        this.timestamp = timestamp;
        this.nonce = 0;
        this.hash = this.calculateHash();
    }

    calculateHash = () => {
        const input = `${this.prevHash} ${this.timestamp} ${JSON.stringify(this.transactions)} ${this.nonce}`;
        return SHA256(input).toString();
    }
}