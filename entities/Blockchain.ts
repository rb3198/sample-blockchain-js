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

  transact = (
    fromAddress: string,
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
      transactionOutputs
    );
    if (!transaction.isTransactionValid) {
      console.error("Invalid transaction received. Breaking transact");
      return false;
    }
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
