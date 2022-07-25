const { deployments, ethers, getNamedAccounts, network } = require("hardhat")
const { assert, expect } = require("chai")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name) ? describe.skip : describe ("RandomIpfsNFT", function()
{
  let deployer, randomIpfsNFT, vrfCoordinatorV2Mock
  beforeEach(async function ()
  {
    deployer = (await getNamedAccounts()).deployer
    await deployments.fixture(["all"])
    randomIpfsNFT = await ethers.getContract("RandomIpfsNFT", deployer)
    vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
  })

  describe("constructor", function()
  {
    it("recieves token URIs", async function ()
    {
      const firstTokenURI = await randomIpfsNFT.getDogTokenURI(0)
      assert(firstTokenURI.includes("ipfs://"))
    })
  })

  describe("requestNFT", function()
  {
    it("reverts if mint fee is not enough", async function ()
    {
      const mintFee = ethers.utils.parseEther("0.005")
      expect(randomIpfsNFT.requestNFT({ value: mintFee })).to.be.revertedWith("RandomIpfsNFT__NotEoughETH()")
    })

    it("emits NFT request event", async function()
    {
      const goodMintFee = (await randomIpfsNFT.getMintFee()).toString()
      const tx = await randomIpfsNFT.requestNFT({ value: goodMintFee })
      const txReceipt = await tx.wait(1)
      const eventEmitted = txReceipt.events[1].event // apparently we're events[1] not events[0]
      // console.log(eventEmitted)
      assert.equal(eventEmitted, "NftRequested")
    })
  })

  describe("fulfillRandomWords", function()
  {
    it("supplies random words", async function()
    {
      const goodMintFee = (await randomIpfsNFT.getMintFee()).toString()
      const tx = await randomIpfsNFT.requestNFT({ value: goodMintFee })
      const txReceipt = await tx.wait(1)
      const requestId = txReceipt.events[1].args.requestId_
      const tx2 = await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, randomIpfsNFT.address)  
      // this function originally exists in vrfCoordinatorV2Mock we just inherited it in RandomIpfsNFT.sol
      const txReceipt2 = await tx2.wait(1)
      const eventEmitted = txReceipt2.events[2].event
      // console.log(txReceipt2)
      assert.equal(eventEmitted, "RandomWordsFulfilled")
      await new Promise(async (resolve, reject) => 
      {
        randomIpfsNFT.once("NftMinted", ()=>
        {
          try
          {          
            console.log("----Nft Minted----")
            resolve()
          }
          catch(e){reject(e)}
        })
      })
    })
  })

  describe("getBreedFromModdedRng", function ()
  {
    it("reverts if random number out of max chance range", async function()
    {
      expect(randomIpfsNFT.getBreedFromModdedRng(200)).to.be.revertedWith("RandomIpfsNFT__RangeOutOfBounds()")
    })
  })

  describe("withdraw", function ()
  {
    it("fails if caller is not Owner", async function()
    {
      const accounts = await ethers.getSigners()
      // randomIpfsNFT = await ethers.getContract("RandomIpfsNFT", accounts[1].address)
      const connectedRandomIpfsNFT = randomIpfsNFT.connect(accounts[2])
      expect(connectedRandomIpfsNFT.withdraw()).to.be.revertedWith("Ownable: caller is not the owner")
    })

    it("successfully transfers earnings to Owner", async function()
    {
      const accounts = await ethers.getSigners()
      const connectedRandomIpfsNFT = randomIpfsNFT.connect(accounts[2])
      const goodMintFee = (await randomIpfsNFT.getMintFee()).toString()
      const tx1 = await connectedRandomIpfsNFT.requestNFT({ value: goodMintFee })
      const tx1Receipt = await tx1.wait(1)
      const requestId = tx1Receipt.events[1].args.requestId_
      const tx2 = await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, randomIpfsNFT.address)  
      await tx2.wait(1)

      const fundedContractBalance = await ethers.provider.getBalance(randomIpfsNFT.address)
      assert.equal(fundedContractBalance.toString(), goodMintFee.toString())

      await new Promise(async (resolve, reject) => 
      {
        randomIpfsNFT.once("NftMinted", async ()=>
        {
          try
          { 
            const tx3 = await randomIpfsNFT.withdraw()
            await tx3.wait(1)
            const newContractBalance = await ethers.provider.getBalance(randomIpfsNFT.address)
            assert.equal(newContractBalance.toString(), "0")
            resolve()
          }
          catch(e){reject(e)}
        })
      })
    })
  })
})