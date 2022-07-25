const pinataSDK = require("@pinata/sdk")
const path = require("path")
const fs = require("fs")
require("dotenv").config()


const pinataApiKey = process.env.PINATA_API_KEY || ""
const pinataApiSecretKey = process.env.PINATA_API_SECRET_KEY || ""
const pinata = pinataSDK(pinataApiKey, pinataApiSecretKey)

async function storeImages(imagesFilePath)
{
  const fullImagesPath = path.resolve(imagesFilePath) // path ending at images/randomNFT
  console.log(fullImagesPath)
  const files = fs.readdirSync(fullImagesPath) // an array of all the img files in the dir
  console.log(files)
  let responses = [] // an array of 3 objects with each containing the ipfs CIDs for its image
  console.log("Uploading To Pinata....")
  for(var file of files) // for ... in uses item index not the actual item in array for...of uses the actual item
  {
    console.log(`Working on ${file}...`)
    const readableFileStream = fs.createReadStream(`${fullImagesPath}/${file}`) // "C:/Users/cloo/Documents.../randomNFT/pug.png"
    try
    {
      const response = await pinata.pinFileToIPFS(readableFileStream)
      responses.push(response) // an array of 3 objects with each containing the ipfs CIDs for its image
    }
    catch(e){console.log(e)}
  }
  return { responses, files }
}

async function storeTokenURIMetadata(metadata)
{
  try
  {
    const response = await pinata.pinJSONToIPFS(metadata)
    return response
  }
  catch(e){console.log(e)}
  return null
}

module.exports = { storeImages, storeTokenURIMetadata }