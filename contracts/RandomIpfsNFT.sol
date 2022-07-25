// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "hardhat/console.sol";

error RandomIpfsNFT__RangeOutOfBounds();
error RandomIpfsNFT__NotEoughETH();
error RandomIpfsNFT__TransferFailed();

contract RandomIpfsNFT is VRFConsumerBaseV2, ERC721URIStorage, Ownable
{
  // when we mint an nft we trigger a vrf call to get us a random number 
  // using that number, we will get a random nft NFT
  // one of a pug, shiba inu or st bernard
  // users have to pay to mint nft
  // the owner of the contract can withdraw the payments

  //type declaration
  enum Breed{PUG, SHIBA_INU, ST_BERNARD}

  VRFCoordinatorV2Interface private immutable i_vrfCoordinator; 
  uint64 private immutable i_subscriptionId;
  bytes32 private immutable i_gasLane;
  uint32 private immutable i_callbackGasLimit;
  uint16 private constant REQUEST_CONFIRMATIONS = 3;
  uint32 private constant NUM_WORDS = 1;

  //VRF Helpers
  uint256 public s_requestId;
  mapping(uint256 => address) public s_requestIdToSender;

  // NFT variables
  uint256 public s_tokenCounter;
  uint256 internal constant MAX_CHANCE_VALUE = 100;
  string[] internal s_dogTokenURIs;
  uint256 internal immutable i_mintFee;

  //events
  event NftRequested(uint256 indexed requestId_, address indexed requester_);
  event NftMinted(Breed dogBreed_, address indexed minter_);

  constructor(address vrfCoordinatorV2_, 
    uint64 subscitptionId_, 
    bytes32 gasLane_, 
    uint32 callbackGasLimit_,
    string[3] memory dogTokenURIs_,  // 0 is pug 1 is shibainu 2 is st bernard
    uint256 mintFee_
  ) VRFConsumerBaseV2(vrfCoordinatorV2_)  ERC721("Random IPFS NFT", "RIN")  // URIStorage also inherits ERC721
  {
    i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2_);
    i_subscriptionId = subscitptionId_;
    i_gasLane = gasLane_;
    i_callbackGasLimit = callbackGasLimit_;
    s_dogTokenURIs = dogTokenURIs_;
    i_mintFee = mintFee_;
  }

  function requestNFT() public payable
  {
    if(msg.value < i_mintFee){revert RandomIpfsNFT__NotEoughETH();}
    s_requestId = i_vrfCoordinator.requestRandomWords(
      i_gasLane,
      i_subscriptionId,
      REQUEST_CONFIRMATIONS,
      i_callbackGasLimit,
      NUM_WORDS
    );

    s_requestIdToSender[s_requestId] = msg.sender;  // the person that requested an nft
    emit NftRequested(s_requestId, msg.sender);
  }

  // fulfill random words is called by chainlink not by msg.sender so don't use msg.sender within it
  function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override 
  {
    address dogOwner = s_requestIdToSender[requestId];  // the address of the nft owner to be
    uint256 newTokenId = s_tokenCounter;
    // modding gotten randomword
    uint256 moddedRng = randomWords[0] % MAX_CHANCE_VALUE;  // number within 0-99
    Breed dogBreed = getBreedFromModdedRng(moddedRng);
    s_tokenCounter = s_tokenCounter + 1;
    _safeMint(dogOwner, newTokenId);
    _setTokenURI(newTokenId, s_dogTokenURIs[uint256(dogBreed)]);  //s_dogTokenURIs[0] will link to a URI of a pug
    emit NftMinted(dogBreed, dogOwner);
  }

  function getBreedFromModdedRng(uint256 moddedRng_) public pure returns(Breed)
  {
    uint256 cumulativeSum = 0;
    uint256[3] memory chanceArray = getChanceArray();
    for (uint256 i =0; i<chanceArray.length; i++)
    {
      // if i'm greater than 10 and greater than 30 loop to the end of the array and give me a st. bernard
      if(moddedRng_ >= cumulativeSum && moddedRng_ < cumulativeSum + chanceArray[i])  // 0<x<10 10<x<40 40<x<100
      {
        return Breed(i);
      }
      cumulativeSum += chanceArray[i];  // acting as temp else statement
    }

    revert RandomIpfsNFT__RangeOutOfBounds();  // incase something wacky happens
  }

  function withdraw() public onlyOwner
  {
    uint256 amount = address(this).balance;
    (bool success, ) = payable(msg.sender).call{value: amount}("");
    if(!success){revert RandomIpfsNFT__TransferFailed();}
  }

  function getChanceArray() public pure returns(uint256[3] memory)
  {
    return [10, 30, MAX_CHANCE_VALUE];  // rarity || probability of attaining the 3 nft breeds 
    // 10% for pug 40% for shibainu 60% for stbernard
  }

  function getMintFee() public view returns(uint256)
  {
    return i_mintFee;
  }

  function getDogTokenURI(uint256 index_) public view returns(string memory)
  {
    return s_dogTokenURIs[index_];
  }

  function getTokenCounter() public view returns(uint256)
  {
    return s_tokenCounter;
  }
}