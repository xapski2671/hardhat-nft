const { network, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { storeImages, storeTokenURIMetadata } = require("../utils/uploadToPinata")
const { verify } = require("../utils/verify")
require("dotenv").config()

const FUND_AMOUNT = "100000000000000000000" // 10 LINK
const imagesLocation = "./images/randomNFT/"
let tokenURIs = 
[
  "ipfs://QmaVkBn2tKmjbhphU7eyztbvSQU5EXDdqRyXZtRhSGgJGo",
  "ipfs://QmYQC5aGZu2PTH8XzbJrbDnvhj3gVs7ya33H9mqUNvST3d",
  "ipfs://QmZYmH5iDbD6v3U2ixoVAjioSzvWJszDzYdbeCLquGSpVm"
]

const metadataTemplate = {
  name: "",
  description: "",
  image: "",
  attributes: [
    {
      trait_type: "Cuteness",
      value: 100,
    },
  ],
}

module.exports = async function(hre)
{
  const { getNamedAccounts, deployments } = hre
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()
  const chainId = network.config.chainId
  let vrfCoordinatorV2Address, subscriptionId
  // Getting our Ipfs Links
  // uploading to our own node (automated)
  // using pinata
  // NFT storage
  if(process.env.UPLOAD_TO_PINATA == "true")
  {
    tokenURIs = await handleTokenURIs()
  }


  if(developmentChains.includes(network.name))
  {
    const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
    vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address
    const tx = await vrfCoordinatorV2Mock.createSubscription()
    const txReceipt = await tx.wait(1)
    subscriptionId = txReceipt.events[0].args.subId
    await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
  }
  else
  {
    vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2
    subscriptionId = networkConfig[chainId].subscriptionId
  }
  
  log("====================================")
  const args = 
  [
    vrfCoordinatorV2Address, 
    subscriptionId, 
    networkConfig[chainId].gasLane,
    networkConfig[chainId].callbackGasLimit,
    tokenURIs, 
    networkConfig[chainId].mintFee,
  ]
  const randomIpfsNft = await deploy("RandomIpfsNFT",
    {
      from: deployer,
      args: args,
      log: true,
      waitConfirmations: network.config.blockConfirmations || 1
    }
  )
  if(!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY)
  {
    log("Verifying...")
    await verify(randomIpfsNft.address, args)
  }
  log("====================================")
}

async function handleTokenURIs()
{
  //using pinata
  tokenURIs = []
  // store image and metadata (json details) in ipfs
  //storing images
  const { responses: imageUploadResponses, files } = await storeImages(imagesLocation)
  
  //creating and storing each image metadata
  for(imageUploadResponseIndex in imageUploadResponses)
  { // create metadata upload metadata
    let tokenURIMetadata = { ...metadataTemplate } // appending metadata object
    tokenURIMetadata.name = files[imageUploadResponseIndex].replace(".png", "") // pug.png becomes pug for name property
    tokenURIMetadata.description = `An adorable ${tokenURIMetadata.name} pup!`
    tokenURIMetadata.image = `ipfs://${imageUploadResponses[imageUploadResponseIndex].IpfsHash}`
    console.log(`Uploading ${tokenURIMetadata.name}...`)
    // storing metadata
    const metadataUploadResponse = await storeTokenURIMetadata(tokenURIMetadata)
    tokenURIs.push(`ipfs://${metadataUploadResponse.IpfsHash}`)
  }
  console.log("Token URIs uploaded!")
  console.log(tokenURIs)
  return tokenURIs
}

module.exports.tags = ["all", "randomipfs", "main"]