# Create an address

## Create an Address

The first thing you’ll need to do anything on the ${Name Chain} is an account. Each account has a public key and a private key. It is created by a user of the blockchain. It also includes account number and sequence number for replay protection.

Because the private key must be kept secret, you can generate the private key with the following command:

Examples:

``` javascript tab="JavaScript"
// generate key entropy
const privateKey = crypto.generatePrivateKey();
// get an address
const address = crypto.getAddressFromPrivateKey(privateKey);

const BnbApiClient = require("@${name}-chain/javascript-sdk");
const axios = require("axios");
const bnbClient = new BnbApiClient(api);
const httpClient = axios.create({ baseURL: api });
bnbClient.chooseNetwork("mainnet"); // or this can be "testnet"
bnbClient.setPrivateKey(privKey);
bnbClient.initChain();

const address = bnbClient.getClientKeyAddress();

console.log("address: ", address);
```

```Go tab="GoLang"
//-----   Import packages  -------------
import (
	sdk "github.com/${githubusername}/go-sdk/client"
	"github.com/${githubusername}/go-sdk/keys"
)
//-----   Init KeyManager  -------------
km, _ := keys.NewKeyManager()
//-----   Init sdk  -------------
client, err := sdk.NewDexClient("dex.${domainchain}", types.TestNetwork, km) // api string can be "https://testnet-dex.${domainchain}" for testnet
accn, _ := client.GetAccount(client.GetKeyManager().GetAddr().String())
//-----   Print Address
fmt.Println(accn)
```

```python tab="Python"
from ${name_chain}.wallet import Wallet
from ${name_chain}.environment import ${Name}Environment

testnet_env = ${Name}Environment.get_testnet_env(, env=testnet_env)
wallet = Wallet.create_random_wallet(env=env)
print(wallet.address)
```

