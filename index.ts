import { AccountNode } from "./entities/Account";
import { BlockChain } from "./entities/Blockchain";
import { Transaction } from "./entities/Transaction";

// Create a new blockChain, which will create the first account with 50 coins.
// Pass this blockchain to all subsequently created accounts
const blockchain = new BlockChain(3);
console.log(
  "Blockchain initialized with init block",
  blockchain.getLatestBlock()
);
const coinbaseAccount = blockchain.coinbaseAccount;
const account1 = new AccountNode(blockchain);
const account2 = new AccountNode(blockchain);

const printBalances = () => {
  console.log("----------------");
  console.log("----BALANCES----");
  console.log("Coinbase: ", coinbaseAccount.getBalance());
  console.log("Account 1: ", account1.getBalance());
  console.log("Account 2: ", account2.getBalance());
};

coinbaseAccount.transact(0.5, [
  {
    to: account1.address.pubAddress,
    destFullAddress: account1.address.p2pkh,
    value: 5,
  },
]);
coinbaseAccount.transact(0.5, [
  {
    to: account2.address.pubAddress,
    destFullAddress: account2.address.p2pkh,
    value: 5,
  },
]);
coinbaseAccount.transact(0.5, [
  {
    to: account1.address.pubAddress,
    destFullAddress: account1.address.p2pkh,
    value: 5,
  },
]);
coinbaseAccount.transact(0.5, [
  {
    to: account2.address.pubAddress,
    destFullAddress: account2.address.p2pkh,
    value: 5,
  },
]);
coinbaseAccount.transact(0.5, [
  {
    to: account2.address.pubAddress,
    destFullAddress: account2.address.p2pkh,
    value: 5,
  },
]);
console.log("No transactions mined");
printBalances();
console.log("Mining with coinbase account");
coinbaseAccount.mineTransactions();
printBalances();
console.log("Is block chain valid? ", blockchain.validateChain());
const txidList = Array.from(blockchain.chain[0].transactions.keys());
const existingTransaction = blockchain.chain[0].transactions.get(txidList[0]);
const tamperedTransaction = {
  ...existingTransaction,
  txid: "abcdefgh",
};
// @ts-ignore
blockchain.chain[0].transactions.set(txidList[0], tamperedTransaction);
console.log("Block 1 modified");

console.log("Is block chain valid ? ", blockchain.validateChain());
