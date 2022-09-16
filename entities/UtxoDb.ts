import { Block } from "./Block";

/**
 * Key: txido => concatenation of txid & output index
 */
type UtxoPool = { [txido: string]: Utxo };

export class Utxo {
  txid: string;
  blockIndex: number;
  outputIndex: number;

  constructor(txid: string, blockIndex: number, outputIndex: number) {
    this.txid = txid;
    this.blockIndex = blockIndex;
    this.outputIndex = outputIndex;
  }
}

export class UtxoDb {
  utxoPool: UtxoPool;
  constructor(blockChain: Block[]) {
    this.utxoPool = this.getUtxoPoolFromBlockChain(blockChain);
  }

  private getUtxoPoolFromBlockChain = (blockChain: Block[]) => {
    const utxoPool: UtxoPool = {};
    blockChain.forEach((block, blockIndex) => {
      const txidList = Object.keys(block.transactions);
      txidList.forEach((txid) => {
        block.transactions[txid].inputs?.forEach((input) => {
          const utxoKey = txid + input.index;
          if (utxoPool.hasOwnProperty(utxoKey)) {
            delete utxoPool[utxoKey];
          }
        });
        block.transactions[txid].outputs?.forEach((output, outputIndex) => {
          const utxoKey = txid + outputIndex;
          if (!utxoPool.hasOwnProperty(utxoKey)) {
            utxoPool[utxoKey] = new Utxo(txid, blockIndex, outputIndex);
          }
        });
      });
    });
    return utxoPool;
  };

  updateUtxoPool = (blockChain: Block[]) => {
    this.utxoPool = this.getUtxoPoolFromBlockChain(blockChain);
  };
  /**
   * Gets a list of UTXOs of a given address
   * @param address Address of the payer
   * @param blockChain Current blockchain
   */
  getUtxoByAddress = (address: string, blockChain: Block[]) => {
    return Object.values(this.utxoPool).filter((utxo) => {
      const { blockIndex, outputIndex, txid } = utxo;
      return (
        !!blockChain[blockIndex] &&
        !!blockChain[blockIndex].transactions[txid] &&
        !!blockChain[blockIndex].transactions[txid].outputs &&
        // @ts-ignore
        blockChain[blockIndex].transactions[txid].outputs[outputIndex]?.to ===
          address
      );
    });
  };

  /**
   * Gets an optionally sorted (by value) list of UTXOs available for a given address
   * @param address Address of the payer
   * @param blockChain Current blockchain
   * @param returnSortedList Should the function sort available UTXOs by their value ?
   */
  getUtxoValueData = (
    address: string,
    blockChain: Block[],
    returnSortedList = false
  ) => {
    if (!address || !blockChain || blockChain.length === 0) {
      return [];
    }
    const utxoList = this.getUtxoByAddress(address, blockChain);
    const utxoValueData: { utxo: Utxo; value: number }[] = [];
    for (let i = 0; i < utxoList.length; i++) {
      const utxo = utxoList[i];
      if (!utxo) {
        continue;
      }
      const { blockIndex, outputIndex, txid } = utxo;
      const block = blockChain[blockIndex];
      const isValidTransaction = block.transactions.hasOwnProperty(txid);
      if (!isValidTransaction) {
        console.error("Invalid UTXO encountered, removing from the DB");
        delete this.utxoPool[txid + outputIndex];
        utxoList.splice(i, 1);
        continue;
      }
      const transaction = block.transactions[txid];
      const { outputs } = transaction;
      const requiredOutput = outputs && outputs[outputIndex];
      if (!requiredOutput) {
        console.error(
          `Output not found in the required transaction with txid ${txid}, output index ${outputIndex}`
        );
        continue;
      }
      utxoValueData.push({
        utxo,
        value: requiredOutput.value,
      });
    }
    return returnSortedList
      ? utxoValueData.sort((a, b) => b.value - a.value)
      : utxoValueData;
  };
}
