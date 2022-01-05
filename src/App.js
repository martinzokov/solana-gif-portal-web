import React, { useEffect, useState } from 'react';
import twitterLogo from './assets/twitter-logo.svg';
import './App.css';
import idl from './idl.json';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { Program, Provider, web3 } from '@project-serum/anchor';
import kp from './keypair.json';
import { FaAngleUp, FaAngleDown } from "react-icons/fa";


// Constants
const TWITTER_HANDLE = '_buildspace';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const {SystemProgram, Keypair} = web3;

const arr = Object.values(kp._keypair.secretKey);
const secret = new Uint8Array(arr);
const baseAccount = web3.Keypair.fromSecretKey(secret)

const programID = new PublicKey(idl.metadata.address);

const network = clusterApiUrl('devnet');

const opts = {
  preflightCommitment: "processed"
}

const App = () => {
  // State
  const [walletAddress, setWalletAddress] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [gifList, setGifList] = useState([]);
  // Actions
  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if (solana) {
        if (solana.isPhantom) {
          console.log('Phantom wallet found!');
          const response = await solana.connect({ onlyIfTrusted: true });
          console.log(
            'Connected with Public Key:',
            response.publicKey.toString()
          );

          /*
           * Set the user's publicKey in state to be used later!
           */
          setWalletAddress(response.publicKey.toString());
        }
      } else {
        alert('Solana object not found! Get a Phantom Wallet 👻');
      }
    } catch (error) {
      console.error(error);
    }
  };

  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      const response = await solana.connect();
      console.log('Connected with Public Key:', response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  const onInputChange = (event) => {
    const { value } = event.target;
    setInputValue(value);
  };

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(connection, window.solana, opts.preflightCommitment);

    return provider;
  };

  const createGifAccount = async()=>{
    try{
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log("ping");
      await program.rpc.startStuffOff({
        accounts:{
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount]
      });
      console.log("Created a new BaseAccount w/ address: ", baseAccount.publicKey.toString());
      await getGifList();
    }catch(error){
      console.log("Error creating BaseAccount account:", error);
    }
  }

  const sendGif = async () => {
    if (inputValue.length === 0) {
      console.log('No Gif link');
      return
    }
    if (!inputValue.match(/(https?:\/\/(.+?\.)?giphy\.com(\/[A-Za-z0-9\-\._~:\/\?#\[\]@!$&'\(\)\*\+,;\=]*)?)/)){
      console.log("Only GIFs from Giphy are supported");
      return
    }
    setInputValue('');
    console.log('Gif link ', inputValue);
    
    try{
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.addGif(inputValue,{
        accounts:{
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },

      });

      console.log("Gif sent to program", inputValue);
      await getGifList();
    } catch(error){
      console.log("Error while sending: ", error);
    }
  };

  const voteGif = async(gifLink, upvote) => {
    try{
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.updateItem(gifLink, upvote, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        }
      });

      await getGifList();
    } catch(error){
      console.log("error when voting:", error);
    }
  }

  const renderNotConnectedContainer = () => (
    <button
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Connect to Wallet
    </button>
  );

  const renderConnectedContainer = () => {
  if (gifList === null){
    return(
      <div className="connected-container">
         <button className="cta-button submit-gif-button" onClick={createGifAccount}>
          Do One-Time Initialization For GIF Program Account
        </button>
      </div>
    )
  }else{
    return(
      <div className="connected-container">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          
          sendGif();
        }}
      >
        <input type="text" placeholder="Enter gif link!" 
          value={inputValue}
          onChange={onInputChange}/>
        <button type="submit" className="cta-button submit-gif-button">Submit</button>
      </form>
      <div className="gif-grid">
        {gifList.map((item, index) => (
          <div className="gif-item" key={index}>
            <img src={item.gifLink} />
            <div style={{color:'white'}}></div>
            <div style={{color:'white'}}>
              <div style={{cursor: "pointer"}}><FaAngleUp size="2em" onClick={()=>voteGif(item.gifLink, true)}/></div>
                <span style={{textSize: '2em'}}>{item.votes.toString()}</span>
                <div style={{cursor: "pointer"}}><FaAngleDown size="2em" onClick={()=>voteGif(item.gifLink, false)}/></div>
            </div>
          </div>
        ))}
      </div>
    </div>
    )
  }
  };

  // UseEffects
  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  const getGifList = async() =>{
    try{
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(baseAccount.publicKey);

      console.log("Got the account", account)
      setGifList(account.gifList)
    } catch(error){
      console.log("Error in getGifList: ",error);
      setGifList(null);
    }
  }
  useEffect(() => {
    if (walletAddress) {
      console.log('Fetching GIF list...');
      
      // Call Solana program here.
      getGifList();
    }
  }, [walletAddress]);

  return (
    <div className="App">
			{/* This was solely added for some styling fanciness */}
			<div className={walletAddress ? 'authed-container' : 'container'}>
        <div className="header-container">
          <p className="header">🖼 GIF Portal</p>
          <p className="sub-text">
            View your GIF collection in the metaverse ✨
          </p>
          {/* Add the condition to show this only if we don't have a wallet address */}
          {!walletAddress && renderNotConnectedContainer()}
        {walletAddress && renderConnectedContainer()}
        </div>
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built on @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};


export default App;