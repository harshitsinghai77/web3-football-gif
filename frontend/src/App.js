import React, { useEffect, useState } from "react";
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
import { Program, Provider, web3, BN } from "@project-serum/anchor";
import { Card, Text, CardFooter, Button, Grid, TextInput } from "grommet";

import idl from "./idl.json";
import kp from "./keypair.json";
import twitterLogo from "./assets/twitter-logo.svg";
import "./App.css";

// Constants
const TWITTER_HANDLE = "harshit_778";
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const { SystemProgram } = web3;
const arr = Object.values(kp._keypair.secretKey);
const secret = new Uint8Array(arr);
const baseAccount = web3.Keypair.fromSecretKey(secret);

const programID = new PublicKey(idl.metadata.address);
const network = clusterApiUrl("devnet");
const opts = {
  preflightCommitment: "processed",
};

const truncateString = (str, num) =>
  str.slice(0, num / 2) + "..." + str.slice(str.length - num / 2, str.length);

const App = () => {
  const [walletAddress, setWalletAddress] = useState();
  const [inputValue, setInputValue] = useState("");
  const [gifList, setGifList] = useState([]);

  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;
      if (solana) {
        if (solana.isPhantom) {
          console.log("Phantom wallet found!");
          const response = await solana.connect({ onlyIfTrusted: true });
          console.log(
            "Connected with Public Key:",
            response.publicKey.toString()
          );

          setWalletAddress(response.publicKey.toString());
        }
      } else {
        alert("Solana object not found! Get a Phantom Wallet 👻");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const createGifAccount = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      console.log("ping");
      await program.rpc.startStuffOff({
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        },
        signers: [baseAccount],
      });
      await getGifList();
    } catch (error) {
      console.log("Error creating BaseAccount account:", error);
    }
  };

  const getProvider = () => {
    const connection = new Connection(network, opts.preflightCommitment);
    const provider = new Provider(
      connection,
      window.solana,
      opts.preflightCommitment
    );
    return provider;
  };

  const connectWallet = async () => {
    const { solana } = window;
    if (solana) {
      const response = await solana.connect();
      console.log("Connected with Public Key:", response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  const getGifList = async () => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);
      const account = await program.account.baseAccount.fetch(
        baseAccount.publicKey
      );

      console.log("Got the account", account);
      setGifList(account.gifList);
    } catch (error) {
      console.log("Error in getGifList: ", error);
      setGifList(null);
    }
  };

  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  useEffect(() => {
    if (walletAddress) {
      console.log("Fetching GIF list...");
      getGifList();
    }
  }, [walletAddress]);

  const sendGif = async (event) => {
    event.preventDefault();
    if (inputValue.length === 0) return;

    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.addGif(inputValue, {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      console.log("GIF successfully sent to program", inputValue);

      await getGifList();
    } catch (error) {
      console.log("Error sending GIF:", error);
    }
    setInputValue("");
    console.log("Gif link:", inputValue);
  };

  const upvoteGif = async (index) => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.upvoteGif(new BN(index), {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      await getGifList();
    } catch (error) {
      console.log("Error upvoting GIF:", error);
    }
  };

  const downvoteGif = async (index) => {
    try {
      const provider = getProvider();
      const program = new Program(idl, programID, provider);

      await program.rpc.downvoteGif(new BN(index), {
        accounts: {
          baseAccount: baseAccount.publicKey,
          user: provider.wallet.publicKey,
        },
      });
      await getGifList();
    } catch (error) {
      console.log("Error upvoting GIF:", error);
    }
  };

  const NotConnectedContainer = () => (
    <button
      className="cta-button connect-wallet-button"
      onClick={connectWallet}
    >
      Connect to Wallet
    </button>
  );

  const connectedContainer = () => {
    if (gifList === null) {
      return (
        <div className="connected-container">
          <button
            className="cta-button submit-gif-button"
            onClick={createGifAccount}
          >
            Do One-Time Initialization For Program Account
          </button>
        </div>
      );
    }
    return (
      <>
        <form onSubmit={sendGif}>
          <div className="wrapper-input">
            <TextInput
              type="text"
              placeholder="Enter gif link!"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
            />
            <button type="submit" className="cta-button submit-gif-button">
              Submit
            </button>
          </div>
        </form>
        <div className="wrapper">
          <Grid columns={["medium", "medium", "medium"]} gap="medium">
            {gifList.map((gif, index) => (
              <Card width="medium" background="light-1">
                <img
                  src={gif.gifLink}
                  key={gif.gifLink}
                  alt={`Gallery ${gif.gifLink}`}
                  className="wrapper-img"
                />
                <Text margin="small">
                  From {truncateString(gif.userAddress.toString(), 20)}
                </Text>
                <CardFooter pad="small" background="light-2">
                  <Button
                    label={`upvote ${gif.upvote.toNumber()}`}
                    onClick={() => upvoteGif(index)}
                    hoverIndicator
                    plain
                  />
                  <Button
                    label={`downvote ${gif.downvote.toNumber()}`}
                    onClick={() => downvoteGif(index)}
                    hoverIndicator
                    plain
                  />
                </CardFooter>
              </Card>
            ))}
          </Grid>
        </div>
      </>
    );
  };

  return (
    <div className="App">
      <div className="container">
        <div className="header-container">
          <p className="header">🖼 Web3 Football</p>
          <p className="sub-text">
            View your favourite Football Gif in the metaverse ✨
          </p>
        </div>
        {!walletAddress ? <NotConnectedContainer /> : connectedContainer()}
        <div className="footer-container">
          <img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built by @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
};

export default App;
