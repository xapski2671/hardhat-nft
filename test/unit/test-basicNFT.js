const { deployments, ethers, getNamedAccounts, network } = require("hardhat")
const { assert, expect } = require("chai")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name) ? describe.skip : describe ("BasicNFT", function()
{
  let deployer, basicNft
  beforeEach(async function ()
  {
    deployer = (await getNamedAccounts()).deployer
    await deployments.fixture(["all"])
    basicNft = await ethers.getContract("BasicNFT", deployer)
  })

  describe("constructor", function () 
  {
    it("token id starts at zero", async function()
    {
      const tokenId = await basicNft.getTokenCounter()
      assert.equal(tokenId.toString(), "0")
    })
  })

  describe("Mint", function () 
  {
    it("mints nft and points to correct token URI", async function ()
    {
      const tx = await basicNft.mintNFT()
      await tx.wait(1)
      const tokenId = await basicNft.getTokenCounter()
      const tokenUri = await basicNft.tokenURI(tokenId.toNumber())
      assert.equal(tokenId.toString(), "1")
      assert(tokenUri.includes("ipfs"))
    })
  })
})