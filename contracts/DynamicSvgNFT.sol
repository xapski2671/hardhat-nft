// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import 'base64-sol/base64.sol';

contract DynamicSvgNFT is ERC721
{
  //mint
  //store imgs data somewhere
  //logic to show x image or y image depending on the situation

  uint256 private s_tokenCounter;
  string private s_lowImageURI;
  string private s_highImageURI;
  string private constant base64EncodedPrefix = "data:image/svg+xml;base64,"; 

  constructor(
    string memory lowSvg_,
    string memory highSvg_
  ) 
  ERC721("Dynamic SVG NFT", "DSN")
  {
    s_tokenCounter = 0;
    s_lowImageURI = svgToImageURI(lowSvg_);
    s_highImageURI = svgToImageURI(highSvg_);
  }

  function svgToImageURI(string memory svg) public pure returns(string memory)
  {
    string memory svgBase64Encoded = Base64.encode(bytes(string(abi.encodePacked(svg)))); // encoding the svg into base64
    return string(abi.encodePacked(base64EncodedPrefix, svgBase64Encoded));  // concatenenating the prefix with the b64code to form a url
  }

  function mintNFT() public 
  {
    _safeMint(msg.sender, s_tokenCounter);
    s_tokenCounter = s_tokenCounter + 1;
  }

  // we'll also be encoding our metadata json into base64
  function tokenURI(uint256 tokenId) public view override returns(string memory)
  {
    require(_exists(tokenId), "URI Query for nonexistent token");
    
  } 
}