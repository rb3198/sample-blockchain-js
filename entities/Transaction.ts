import { SHA256 } from "crypto-js";
import { Utxo } from "./UtxoDb";

export class Input {
  /**
   * Reference to the previous transaction
   */
  txid: string;
  /**
   * Index of the previously unspent output in transaction with ID txid
   */
  index: number;
  /**
   * Block index of the previously unspent output
   */
  blockIndex: number;
  constructor(txid: string, blockIndex: number, index: number) {
    this.txid = txid;
    this.blockIndex = blockIndex;
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
  timestamp: number;
  isTransactionValid: boolean = false;
  transactionFee: number;
  txid: string;
  signature?: Buffer;
  inputs: Input[];
  outputs: Output[];
  isCoinbase: boolean;
  constructor(
    srcAddress: string,
    availableUtxos: { utxo: Utxo; value: number }[],
    outputs: Output[],
    transactionFee: number,
    timestamp?: number,
    isCoinbase?: boolean,
    blockReward?: number
  ) {
    this.timestamp = timestamp || Date.now();
    this.isCoinbase = isCoinbase || false;
    const outputAmount = outputs
      .map((output) => output.value)
      .reduce((total, outputValue) => total + outputValue);
    const targetAmount = outputAmount + transactionFee;
    this.outputs = outputs;
    const { inputs, change } = this.getInputsAndTransactChange(
      availableUtxos,
      targetAmount
    );
    this.transactionFee = transactionFee;
    this.inputs = inputs;
    if (change > 0) {
      this.outputs.push(new Output(change, srcAddress));
    }
    if (isCoinbase) {
      this.isTransactionValid =
        this.outputs.length === 2 &&
        this.outputs[0].value === blockReward &&
        this.outputs[1].value > 0;
    } else if (this.isTransactionValid) {
      // also verify other transactions in blockchain class using srcAddress
      // Verify if all the inputs refer to utxos of the same address as srcAddress
      this.isTransactionValid = this.inputs.length > 0 && !!srcAddress;
    }
    this.txid = this.getTxid();
  }

  private getTxid = () => {
    const transactionData = `${this.inputs}-${this.outputs}-${
      this.timestamp
    }-${Math.random()}`;
    return SHA256(SHA256(transactionData)).toString();
  };

  /**
   * Function to get inputs & transaction change
   * @param availableUtxos All the available UTXOs in the ownership of the source
   * @param targetAmount Total output amount + mining reward of the transaction
   * @returns Input array & return change of the transaction
   */
  getInputsAndTransactChange = (
    availableUtxos: { utxo: Utxo; value: number }[],
    targetAmount: number
  ) => {
    const inputs: Input[] = [];
    if (this.isCoinbase) {
      return {
        inputs,
        change: 0,
      };
    }
    if (!this.isCoinbase && (!availableUtxos || availableUtxos.length === 0)) {
      this.isTransactionValid = false;
      return {
        inputs,
        change: 0,
      };
    }
    const amountAvailableToTransact = Object.values(availableUtxos)
      .map((utxoData) => utxoData.value)
      .reduce((targetAmount, value) => targetAmount + value);
    if (amountAvailableToTransact < targetAmount) {
      console.error(
        "Total coins owned by the given address is less than the total amount demanded by the transaction."
      );
      this.isTransactionValid = false;
      return { inputs, change: 0 };
    }
    const utxosToBeSpent = this.getUtxosToBeSpent(targetAmount, availableUtxos);
    let totalInputAmount = 0;
    inputs.push(
      ...utxosToBeSpent.map((utxoWithValue) => {
        const { utxo, value } = utxoWithValue;
        const { txid, blockIndex, outputIndex } = utxo;
        totalInputAmount += value;
        return new Input(txid, blockIndex, outputIndex);
      })
    );
    const change = totalInputAmount - targetAmount;
    if (change < 0) {
      console.error(
        "Error occured while transacting. Total Input amount < Target"
      );
      this.isTransactionValid = false;
      return { inputs, change: 0 };
    }
    this.isTransactionValid = true;
    return { inputs, change };
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
}

export enum TransactionType {
  P2PKH = "PayToPublicKeyHash",
  PK = "PublicKey",
  MULTISIG = "MultiSignature",
  P2SH = "PayToScriptHash",
  OP_RETURN = "DataOutput",
}
