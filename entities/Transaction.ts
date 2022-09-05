export class Input {
  /**
   * Reference to the previous transaction
   */
  txid: string;
  /**
   * Index of the unspent output in transaction with ID txid
   */
  index: number;
  constructor(txid: string, index: number) {
    this.txid = txid;
    this.index = index;
  }
}

export class Output {
  /**
   * Value to be received by the receiver
   */
  value: number;
  /**
   * Address of the receiver
   */
  to: string;

  constructor(value: number, to: string) {
    this.value = value;
    this.to = to;
  }
}

export class Transaction {
  from: string;
  to: string;
  value: number;
  timestamp: number;
  txid?: string;
  inputs?: Input[];
  outputs?: Output[];
  constructor(from: string, to: string, value: number, timestamp?: number) {
    this.from = from;
    this.to = to;
    this.value = value;
    this.timestamp = timestamp || Date.now();
  }
}

export enum TransactionType {
  P2PKH = "PayToPublicKeyHash",
  PK = "PublicKey",
  MULTISIG = "MultiSignature",
  P2SH = "PayToScriptHash",
  OP_RETURN = "DataOutput",
}
