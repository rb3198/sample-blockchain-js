import NodeRSA from "node-rsa";
import { SHA256, RIPEMD160 } from "crypto-js";
import { TransactionType } from "./Transaction";

export class Address {
  p2pkh: string;
  pk: string;
  multiSig: string;
  p2sh: string;
  opReturn: string;
  pubAddress: string;

  constructor(hashedPubKey: string) {
    this.pubAddress = hashedPubKey;
    this.p2pkh = Address.generateAddress(TransactionType.P2PKH, hashedPubKey);
    this.pk = Address.generateAddress(TransactionType.PK, hashedPubKey);
    this.multiSig = Address.generateAddress(
      TransactionType.MULTISIG,
      hashedPubKey
    );
    this.p2sh = Address.generateAddress(TransactionType.P2SH, hashedPubKey);
    this.opReturn = Address.generateAddress(
      TransactionType.OP_RETURN,
      hashedPubKey
    );
  }

  static generateAddress = (
    transactionType: TransactionType,
    hashedPubKey: string
  ) => {
    const prefixedPubKey = transactionType.toString() + hashedPubKey;
    const verifiableHash = SHA256(SHA256(prefixedPubKey)).toString();
    /**
     * First 32 bits, ie 4 characters of the SHA256 hash of SHA 256 hash of the prefixed public key
     */
    const checksum = verifiableHash.slice(0, 4);
    return prefixedPubKey + checksum;
  };
}

export class AccountNode {
  private keyPair: NodeRSA;
  address: Address;

  constructor() {
    this.keyPair = new NodeRSA({ b: 512 });
    this.address = this.generateAddress();
  }

  private generateAddress = () => {
    const pubKey = this.keyPair.exportKey("public");
    const pubKeyHash = SHA256(pubKey);
    const finalHash = RIPEMD160(pubKeyHash).toString();
    return new Address(finalHash);
  };
}
