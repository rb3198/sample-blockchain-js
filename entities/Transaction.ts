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
  txid?: string;
  signature?: string;
  inputs: Input[];
  outputs: Output[];
  constructor(
    srcAddress: string,
    availableUtxos: { utxo: Utxo; value: number }[],
    outputs: Output[],
    timestamp?: number
  ) {
    this.timestamp = timestamp || Date.now();
    const targetAmount = outputs
      .map((output) => output.value)
      .reduce((total, outputValue) => total + outputValue);
    this.outputs = outputs;
    const { inputs, change } = this.getInputsAndTransactChange(
      availableUtxos,
      targetAmount
    );
    this.inputs = inputs;
    this.outputs.push(new Output(change, srcAddress));
  }

  getInputsAndTransactChange = (
    availableUtxos: { utxo: Utxo; value: number }[],
    targetAmount: number
  ) => {
    const inputs: Input[] = [];
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
