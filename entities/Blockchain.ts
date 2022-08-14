import { Block } from "./Block";
import { Transaction } from "./Transaction";

export class BlockChain {
  difficulty: number;
  chain: Block[];
  constructor(difficulty: number, chain?: Block[] | null) {
    this.difficulty = difficulty;
    this.chain = chain || [new Block("", Date.now(), [])];
  }

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
