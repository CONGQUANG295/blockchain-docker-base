const STAKING_VAULT_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "user", type: "address" },
      { indexed: true, name: "validator", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "escrow", type: "uint256" },
    ],
    name: "PendingUnstakeInitiated",
    type: "event",
  },
  {
    constant: false,
    inputs: [
      { name: "_user", type: "address" },
      { name: "_validator", type: "address" },
    ],
    name: "completeUnstake",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: false,
    inputs: [{ name: "_user", type: "address" }],
    name: "claimVested",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "releaseDelayPeriod",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
];

module.exports = { STAKING_VAULT_ABI };
