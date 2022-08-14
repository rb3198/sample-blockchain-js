import { BlockChain } from "./entities/Blockchain";
import { Transaction } from "./entities/Transaction";

const blockchain = new BlockChain(3);
console.log(
  "Blockchain initialized with init block",
  blockchain.getLatestBlock()
);

const transactionsToBeAdded = [
  new Transaction("Ronit", "Saanya", 200),
  new Transaction("Ronit", "Aadarsh", 250),
  new Transaction("Saanya", "Hitesh", 100),
];

transactionsToBeAdded.forEach((transaction) => {
  blockchain.addBlock([transaction], Date.now());
});

console.log("Is block chain valid? ", blockchain.validateChain());

blockchain.chain[1].transactions = [
  new Transaction("Ronit", "Aadarsh", 200),
  new Transaction("Saanya", "Hitesh", 100),
];

console.log("Block 1 modified");

console.log("Is block chain valid ? ", blockchain.validateChain());
