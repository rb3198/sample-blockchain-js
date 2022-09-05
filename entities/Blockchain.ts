import { Address } from "./Account";
import { Block } from "./Block";
import { Transaction, TransactionType } from "./Transaction";
import { Utxo, UtxoDb } from "./UtxoDb";

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
   * @param receiverAddress Receiver's address without the checksum of the transaction
   * @param addressToVerify
   */
  verifyReceiverAddress = (
    type: TransactionType,
    receiverAddress: string,
    addressToVerify: string
  ) => {
    const address = Address.generateAddress(type, receiverAddress);
    return address === addressToVerify;
  };

  transact = (
    fromAddress: string,
    toAddress: string,
    type: TransactionType,
    amount: number
  ) => {
    if (!this.verifyReceiverAddress(type, toAddress, "")) {
      return false;
    }
    const availableUtxos = this.utxoDb.getUtxoValueData(
      fromAddress,
      this.chain,
      true
    );
    const amountAvailableToTransact = Object.values(availableUtxos)
      .map((utxoData) => utxoData.value)
      .reduce((totalAmount, value) => totalAmount + value);
    if (amountAvailableToTransact < amount) {
      console.error(
        "Total amount available for the given address is less than the coins owned by it."
      );
      return false;
    }
    const utxosToBeSpent = this.getUtxosToBeSpent(amount, availableUtxos);
  };

  private getUtxosToBeSpent = (
    amount: number,
    availableUtxos: { utxo: Utxo; value: number }[]
  ) => {
    const utxosToBeSpent = [];
    let totalInputAmount = 0;
    let index = 0;
    while (totalInputAmount < amount && index < availableUtxos.length) {
      utxosToBeSpent.push(availableUtxos[index]);
      totalInputAmount += availableUtxos[index].value;
      index++;
    }
    return utxosToBeSpent;
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
