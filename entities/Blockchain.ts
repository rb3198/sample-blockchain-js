import NodeRSA from "node-rsa";
import { Address } from "./Account";
import { Block } from "./Block";
import { Output, Transaction, TransactionType } from "./Transaction";
import { UtxoDb } from "./UtxoDb";

class Destination extends Output {
  destFullAddress: string;
  constructor(value: number, to: string, destFullAddress: string) {
    super(value, to);
    this.destFullAddress = destFullAddress;
  }
}
export class BlockChain {
  difficulty: number;
  chain: Block[];
  private pendingTransactions: {
    transaction: Transaction;
    inputPubKey: string;
  }[];
  private utxoDb: UtxoDb;
  /**
   * Number of transactions allowed to be stored in a block
   *
   * Kept 10 for simplicity. Typically 500+ per block
   */
  blockTransactionsLimit = 10;
  constructor(difficulty: number, chain?: Block[] | null) {
    this.difficulty = difficulty;
    this.chain = chain || [new Block("", Date.now(), [])];
    this.utxoDb = new UtxoDb(this.chain);
    this.pendingTransactions = [];
  }

  /**
   * Function to verify if the receiver address is correct
   * @param type Type of the transaction
   * @param receiverAddresses Receiver's address without the checksum of the transaction
   * @param addressesToVerify
   */
  verifyReceiverAddresses = (
    type: TransactionType,
    receiverAddresses: string[],
    addressesToVerify: string[]
  ) => {
    if (receiverAddresses.length !== addressesToVerify.length) {
      return false;
    }
    return receiverAddresses.every((address, index) => {
      const { checksum: generatedChecksum } = Address.generateAddress(
        type,
        address
      );
      const addressToVerify = addressesToVerify[index];
      const checksum = addressToVerify.slice(-4);
      return checksum === generatedChecksum;
    });
  };

  /**
   * Pushes the transaction to pending transactions, ordering them by mining reward value
   * @param transaction Transaction to be pushed
   */
  private pushToPendingTransactions = (transaction: {
    transaction: Transaction;
    inputPubKey: string;
  }) => {
    let i = this.pendingTransactions.length - 1;
    const { miningReward } = transaction.transaction;
    let isInserted = false;
    while (i > 0) {
      if (this.pendingTransactions[i].transaction.miningReward > miningReward) {
        this.pendingTransactions.splice(i + 1, 0, transaction);
        isInserted = true;
        break;
      }
      i--;
    }
    if (!isInserted) {
      this.pendingTransactions.splice(i, 0, transaction);
    }
  };

  transact = (
    fromAddress: string,
    inputPubKey: string,
    sign: (data: any) => Buffer,
    miningReward: number,
    outputs: Destination[],
    type: TransactionType
  ) => {
    const outputAddresses = outputs.map((output) => output.to);
    const fullAddresses = outputs.map((output) => output.destFullAddress);
    if (!this.verifyReceiverAddresses(type, outputAddresses, fullAddresses)) {
      console.error(
        "Receiver addresses couldn't be verified. Breaking transact."
      );
      return false;
    }
    const availableUtxos = this.utxoDb.getUtxoValueData(
      fromAddress,
      this.chain,
      true
    );
    const transactionOutputs = outputs.map(
      (output) => new Output(output.value, output.to)
    );
    const transaction = new Transaction(
      fromAddress,
      availableUtxos,
      transactionOutputs,
      miningReward
    );
    transaction.signature = sign(transaction.txid);
    if (!transaction.isTransactionValid) {
      console.error("Invalid transaction received. Breaking transact");
      return false;
    }
    this.pushToPendingTransactions({ transaction, inputPubKey });
    console.log(
      `Transaction with txid ${transaction.txid} pushed to pending transactions!`
    );
    return true;
  };

  minePendingTransactions = () => {
    const totalPendingTransactions = this.pendingTransactions.length;
    if (totalPendingTransactions < this.blockTransactionsLimit) {
      console.log(
        "Pending transactions less than block limit. Wait for it to fill up!"
      );
      return false;
    }
    const newBlockTransactions = [];
    for (let i = 0; i < this.blockTransactionsLimit; i++) {
      const { transaction, inputPubKey } = this.pendingTransactions[i];
      const { txid, signature } = transaction;
      if (!signature) {
        console.warn(
          `Transaction with txid ${transaction.txid} Contains no signature! Skipping it.`
        );
        continue;
      }
      const rsaPair = new NodeRSA({ b: 512 });
      rsaPair.importKey(inputPubKey);
      if (!rsaPair.verify(txid, signature)) {
        console.warn(
          `Transaction with txid ${txid} contains invalid signature! Skipping it.`
        );
        continue;
      }
      newBlockTransactions.push(transaction);
    }
    this.addBlock(newBlockTransactions, Date.now());
    this.pendingTransactions = this.pendingTransactions.slice(
      this.blockTransactionsLimit
    );
  };

  addBlock = (transactions: Transaction[], timestamp: number) => {
    const latestBlock = this.getLatestBlock();
    const block = new Block(latestBlock.hash, timestamp, transactions);
    let number = 0;
    console.log("Adding new block!");
    let newHash = block.calculateHash();
    while (
      newHash.slice(0, this.difficulty) !==
      new Array(this.difficulty + 1).join("0")
    ) {
      number++;
      block.nonce = number;
      newHash = block.calculateHash();
    }
    block.hash = block.calculateHash();
    this.chain.push(block);
    console.log("Block added with hash", block.hash);
  };

  getLatestBlock = () => {
    return this.chain[this.chain.length - 1];
  };

  validateChain = () => {
    let isChainValid = true;
    this.chain.every((block, index) => {
      if (block.hash !== block.calculateHash()) {
        isChainValid = false;
        return false;
      }
      if (index > 0 && block.prevHash !== this.chain[index - 1].hash) {
        isChainValid = false;
        return false;
      }
      return true;
    });
    return isChainValid;
  };
}
