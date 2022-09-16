import NodeRSA from "node-rsa";
import { AccountNode, Address } from "./Account";
import { Block } from "./Block";
import { Output, Transaction, TransactionType } from "./Transaction";
import { UtxoDb } from "./UtxoDb";

export class Destination extends Output {
  destFullAddress: string;
  constructor(value: number, to: string, destFullAddress: string) {
    super(value, to);
    this.destFullAddress = destFullAddress;
  }
}
export class BlockChain {
  difficulty: number;
  chain: Block[];
  /**
   * Reward given to mine a block
   *
   * Halves every 5 blocks for simplicity
   */
  blockReward: number = 50;
  coinbaseAccount: AccountNode;
  private pendingTransactions: {
    transaction: Transaction;
    inputPubKey: string;
  }[];
  private utxoDb: UtxoDb;
  /**
   * Number of transactions allowed to be stored in a block
   *
   * Kept 5 for simplicity. Typically 500+ per block
   */
  blockTransactionsLimit = 5;
  constructor(difficulty: number) {
    this.difficulty = difficulty;
    this.chain = [];
    const { coinbaseAccount } = this.initialiseChain();
    this.coinbaseAccount = coinbaseAccount;
    this.utxoDb = new UtxoDb(this.chain);
    this.pendingTransactions = [];
  }

  /**
   * Initializes the blockchain by creating the coinbase account
   * @returns Coinbase account
   */
  initialiseChain = () => {
    const coinbaseAccount = new AccountNode(this);
    const coinbaseTransaction = new Transaction(
      "",
      [],
      [
        new Output(this.blockReward, coinbaseAccount.address.pubAddress),
        new Output(1, coinbaseAccount.address.pubAddress),
      ],
      0,
      Date.now(),
      true,
      this.blockReward
    );
    this.addBlock([coinbaseTransaction], Date.now());
    return {
      coinbaseAccount,
    };
  };

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
   * @param transaction Transaction to be pushed with inputPubKey, ie public key of the input
   */
  private pushToPendingTransactions = (transaction: {
    transaction: Transaction;
    inputPubKey: string;
  }) => {
    let i = this.pendingTransactions.length - 1;
    const { transactionFee } = transaction.transaction;
    let isInserted = false;
    while (i > 0) {
      if (
        this.pendingTransactions[i].transaction.transactionFee > transactionFee
      ) {
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
    transactionFee: number,
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
      transactionFee
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

  minePendingTransactions = (miningNodeAddress: string) => {
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
    const totalTransactionFee = newBlockTransactions
      .map((transaction) => transaction.transactionFee)
      .reduce((total, reward) => total + reward);
    const transactionFeeOutput = new Output(
      totalTransactionFee,
      miningNodeAddress
    );
    const blockRewardOutput = new Output(this.blockReward, miningNodeAddress);
    const coinbaseTransaction = new Transaction(
      "",
      [],
      [blockRewardOutput, transactionFeeOutput],
      0,
      Date.now(),
      true,
      this.blockReward
    );
    newBlockTransactions.push(coinbaseTransaction);
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
    !!this.utxoDb && this.utxoDb.updateUtxoPool(this.chain);
    if (this.chain.length % 5 === 0) {
      this.blockReward /= 2;
    }
  };

  getLatestBlock = () => {
    if (this.chain.length > 0) {
      return this.chain[this.chain.length - 1];
    }
    // coinbase
    const dummyBlock = new Block("", Date.now(), []);
    dummyBlock.hash = "";
    return dummyBlock;
  };

  getAccountBalance = (address: string) => {
    const utxoList = this.utxoDb.getUtxoValueData(address, this.chain, false);
    if (utxoList.length === 0) {
      return 0;
    }
    return utxoList
      .map((utxoWithValue) => utxoWithValue.value)
      .reduce((total, value) => total + value);
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
