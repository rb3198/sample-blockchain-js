import { Transaction } from "./Transaction";
import { SHA256 } from "crypto-js";

export type TransactionDict = Map<string, Transaction>;

export class Block {
  prevHash: string;
  transactions: TransactionDict;
  hash: string;
  timestamp: number;
  nonce: number;

  constructor(
    prevHash: string,
    timestamp: number,
    transactionList: Transaction[]
  ) {
    this.prevHash = prevHash;
    this.transactions = this.getTransactionDict(transactionList);
    this.timestamp = timestamp;
    this.nonce = 0;
    this.hash = this.calculateHash();
  }

  private getTransactionDict = (
    transactionList: Transaction[]
  ): TransactionDict => {
    const transactionDict: TransactionDict = new Map();
    if (!transactionList || transactionList.length === 0) {
      return transactionDict;
    }
    transactionList.forEach((transaction) => {
      if (!transaction.txid) {
        console.warn("Transaction ID not present => Not a valid transaction!");
      } else {
        transactionDict.set(transaction.txid, transaction);
      }
    });
    return transactionDict;
  };

  calculateHash = () => {
    const input = `${this.prevHash} ${this.timestamp} ${JSON.stringify(
      this.transactions
    )} ${this.nonce}`;
    return SHA256(input).toString();
  };
}
