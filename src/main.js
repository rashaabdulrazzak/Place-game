import "regenerator-runtime/runtime";

import * as nearAPI from "near-api-js";
import getConfig from "./config";

let nearConfig = getConfig(process.env.NODE_ENV || "development");
// Connects to NEAR and provides `near`, `walletAccount` and `contract` objects in `window` scope
async function connect() {
  // Initializing connection to the NEAR node.
  window.near = await nearAPI.connect(
    Object.assign(nearConfig, {
      deps: { keyStore: new nearAPI.keyStores.BrowserLocalStorageKeyStore() },
    })
  );

  // Needed to access wallet login
  window.walletAccount = new nearAPI.WalletAccount(window.near);

  // Initializing our contract APIs by contract name and configuration.
  window.contract = await near.loadContract(nearConfig.contractName, {
    viewMethods: ["getMap"], // <-- find this line and change it to match
    changeMethods: ["setCoords"], // <-- find this line and change it to match
    sender: window.walletAccount.getAccountId(),
  });
}

function updateUI() {
  if (!window.walletAccount.getAccountId()) {
    Array.from(document.querySelectorAll(".sign-in")).map(
      (it) => (it.style = "display: block;")
    );
  } else {
    Array.from(document.querySelectorAll(".after-sign-in")).map(
      (it) => (it.style = "display: block;")
    );
  }
}

// Log in user using NEAR Wallet on "Sign In" button click
document.querySelector(".sign-in .btn").addEventListener("click", () => {
  walletAccount.requestSignIn(nearConfig.contractName, "NEAR token example");
});

document.querySelector(".sign-out .btn").addEventListener("click", () => {
  walletAccount.signOut();
  // TODO: Move redirect to .signOut() ^^^
  window.location.replace(window.location.origin + window.location.pathname);
});
document.querySelector("#myCanvas").addEventListener("click", (event) => {
  handleCanvasClick(event);
});
window.nearInitPromise = connect()
  .then(updateUI)
  .then(loadBoardAndDraw)
  .catch(console.error);
// NEAR Place application Code

/**
 * initialize the board with empty colors
 */
function loadBoardAndDraw() {
  const board = getBoard().then((fullMap) => {
    const canvas = document.getElementById("myCanvas");
    const ctx = canvas.getContext("2d");
    let i = 0;
    for (let x = 0; x < 10; x++) {
      for (let y = 0; y < 10; y++) {
        let color = fullMap[i] || "000000";
        ctx.fillStyle = "#" + color;
        ctx.fillRect(x * 10, y * 10, 10, 10);
        i++;
      }
    }
  });
}

/**
 * handle a mouse click event on the canvas element
 * @param event the event raised by mouse click on the canvas
 */
function handleCanvasClick(event) {
  const canvas = document.getElementById("myCanvas");
  const ctx = canvas.getContext("2d");
  const position = getMousePosition(canvas, event);
  const x = Math.floor(position.x / 10);
  const y = Math.floor(position.y / 10);

  const coords = x + "," + y;
  const rgb = document.getElementById("picker").value;
  ctx.fillStyle = "#" + rgb;
  ctx.fillRect(x * 10, y * 10, 10, 10);

  console.log(`The point (${coords}) was set to color #${rgb}`);
  let args = {
    coords,
    value: rgb,
  };
  window.contract.setCoords(args);
}

/**
 * capture the mouse position
 * @param canvas the canvas element on the page
 * @param event the event raised by mouse click on the canvas (see handleCanvasClick)
 */
function getMousePosition(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

/**
 * get the map from the blockchain
 */
async function getBoard() {
  const result = await window.contract.getMap();

  renderBoard(result);
  return result;
}

/**
 * helper function to render the board to the developer console
 */
function renderBoard(board) {
  console.log(
    "\n\nThe NEAR Place board is currently stored on the blockchain as ..."
  );
  console.table(array_chunks(board, 10)); // assuming rows are 10 wide

  // src: https://stackoverflow.com/questions/8495687/split-array-into-chunks#comment84212474_8495740
  function array_chunks(array, chunk_size) {
    return Array(Math.ceil(array.length / chunk_size))
      .fill()
      .map((_, index) => index * chunk_size)
      .map((begin) => array.slice(begin, begin + chunk_size));
  }
}
