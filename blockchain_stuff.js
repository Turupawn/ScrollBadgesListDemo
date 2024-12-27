const NETWORK_ID = 534352

const PROFILE_REGISTRY_ADDRESS = "0xB23AF8707c442f59BDfC368612Bd8DbCca8a7a5a"
const EAS_ADDRESS = "0xC47300428b6AD2c7D03BB76D05A176058b47E6B0"

const BADGE_ABI_PATH = "./json_abi/Badge.json"
const EAS_ABI_PATH = "./json_abi/EAS.json"
const PROFILE_ABI_PATH = "./json_abi/Profile.json"
const PROFILE_REGISTRY_ABI_PATH = "./json_abi/ProfileRegistry.json"

var profile_registry_contract
var eas_contract

var accounts
var web3

function metamaskReloadCallback() {
  window.ethereum.on('accountsChanged', (accounts) => {
    document.getElementById("web3_message").textContent="Account changed, reloading...";
    window.location.reload()
  })
  window.ethereum.on('networkChanged', (accounts) => {
    document.getElementById("web3_message").textContent="Network changed, reloading...";
    window.location.reload()
  })
}

const getWeb3 = async () => {
  return new Promise((resolve, reject) => {
    if(document.readyState=="complete")
    {
      if (window.ethereum) {
        const web3 = new Web3(window.ethereum)
        window.location.reload()
        resolve(web3)
      } else {
        reject("must install MetaMask")
        document.getElementById("web3_message").textContent="Error: Please connect to Metamask";
      }
    }else
    {
      window.addEventListener("load", async () => {
        if (window.ethereum) {
          const web3 = new Web3(window.ethereum)
          resolve(web3)
        } else {
          reject("must install MetaMask")
          document.getElementById("web3_message").textContent="Error: Please install Metamask";
        }
      });
    }
  });
};

const getContract = async (web3, address, abi_path) => {
  const response = await fetch(abi_path);
  const data = await response.json();
  
  const netId = await web3.eth.net.getId();
  contract = new web3.eth.Contract(
    data,
    address
    );
  return contract
}

async function loadDapp() {
  metamaskReloadCallback()
  document.getElementById("web3_message").textContent="Please connect to Metamask"
  var awaitWeb3 = async function () {
    web3 = await getWeb3()
    web3.eth.net.getId((err, netId) => {
      if (netId == NETWORK_ID) {
        var awaitContract = async function () {
          profile_registry_contract = await getContract(web3, PROFILE_REGISTRY_ADDRESS, PROFILE_REGISTRY_ABI_PATH)
          eas_contract = await getContract(web3, EAS_ADDRESS, EAS_ABI_PATH)
          document.getElementById("web3_message").textContent="You are connected to Metamask"
          web3.eth.getAccounts(function(err, _accounts){
            accounts = _accounts
            if (err != null)
            {
              console.error("An error occurred: "+err)
            } else if (accounts.length > 0)
            {
              onWalletConnectedCallback()
              document.getElementById("account_address").style.display = "block"
            } else
            {
              document.getElementById("connect_button").style.display = "block"
            }
          });
        };
        awaitContract();
      } else {
        document.getElementById("web3_message").textContent="Please connect to Scroll Mainnet";
      }
    });
  };
  awaitWeb3();
}

async function connectWallet() {
  await window.ethereum.request({ method: "eth_requestAccounts" })
  accounts = await web3.eth.getAccounts()
  onWalletConnectedCallback()
}

loadDapp()

const onWalletConnectedCallback = async () => {
    let profileContractAddress = await profile_registry_contract.methods.getProfile(accounts[0]).call();

    profile_contract = await getContract(web3, profileContractAddress, PROFILE_ABI_PATH)

    // Assuming the contract has a method `getBadges()` that returns all badges
    const badges = await profile_contract.methods.getValidBadges().call();

    for (let i = 0; i < badges.length; i++) {
        let badgeAttestation = await eas_contract.methods.getAttestation(badges[i]).call();
        let badgeAttestationData = badgeAttestation[badgeAttestation.length - 1];
        let badgeContractAddress = `0x${badgeAttestationData.slice(26, 66)}`;
        
        let badge_contract = await getContract(web3, badgeContractAddress, BADGE_ABI_PATH);
        
        let tokenURI = await badge_contract.methods.badgeTokenURI(badges[i]).call();
        
        fetch(tokenURI)
            .then(response => response.json()) // Parse the JSON response
            .then(data => {
                // Create a container for the badge
                const badgeContainer = document.getElementById('badge-container');
        
                // Create a div for each badge to prevent overwriting
                const badgeDiv = document.createElement('div');
                badgeDiv.style.marginBottom = '20px'; // Optional styling for spacing
        
                // Create an image element
                const imageElement = document.createElement('img');
                imageElement.src = data.image; // Set the image source to the URL from the data
                imageElement.alt = data.name;  // Set the alt text to the badge name
                imageElement.style.maxWidth = '300px'; // Optional styling for image size
        
                // Create a title and description
                const titleElement = document.createElement('h3');
                titleElement.textContent = data.name;
        
                const descriptionElement = document.createElement('p');
                descriptionElement.textContent = data.description;
        
                // Create a link to EASScan
                const easScanLink = document.createElement('a');
                easScanLink.href = `https://scroll.easscan.org/attestation/view/${badges[i]}`; // Construct the URL for EASScan
                easScanLink.textContent = 'View on EASScan'; // Link text
        
                // Append the title, description, image, and EASScan link to the badge div
                badgeDiv.appendChild(titleElement);
                badgeDiv.appendChild(descriptionElement);
                badgeDiv.appendChild(imageElement);
                badgeDiv.appendChild(easScanLink);
        
                // Append the badge div to the main badge container
                badgeContainer.appendChild(badgeDiv);
            })
            .catch(error => {
                console.error('Error fetching badge data:', error);
            });
    }
}