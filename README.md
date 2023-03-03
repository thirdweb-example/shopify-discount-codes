# Shopify Discount Codes for NFT Holders

This template allows you to generate discount codes for your Shopify store to holders of your NFT Collection using [Auth](https://portal.thirdweb.com/auth).

## Using This Repo

To create your own version of this template, you can use the following steps:

Run this command from the terminal to clone this project and install the required dependencies:

```bash
npx thirdweb create --template shopify-discount-codes
```

Create a copy of the `.env.example` file and rename it to `.env`. Then, fill in the values for the following environment variables:

```text
ADMIN_PRIVATE_KEY=xxx
NFT_COLLECTION_ADDRESS=xxx
SHOPIFY_SECRET_KEY=xxx
SHOPIFY_SITE_URL=xxx
SHOPIFY_ACCESS_TOKEN=xxx
```

## Guide

This section explores the core elements of the code.

### Auth

First, we setup thirdweb Auth by configuring our `ThirdwebProvider` in the `_app.tsx` file:

```tsx
// This is the chainId your dApp will work on.
const activeChainId = ChainId.Polygon;

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ThirdwebProvider
      desiredChainId={activeChainId}
      authConfig={{
        authUrl: "/api/auth",
        domain: "example.com",
      }}
    >
      <Component {...pageProps} />
    </ThirdwebProvider>
  );
}

export default MyApp;
```

We also create an API route at `/api/auth/[...thirdweb].ts` that exports the `ThirdwebAuthHandler`:

```tsx
import { ThirdwebAuth } from "@thirdweb-dev/auth/next";

export const { ThirdwebAuthHandler, getUser } = ThirdwebAuth({
  // Using environment variables to secure your private key is a security vulnerability.
  // Learn how to store your private key securely:
  // https://portal.thirdweb.com/sdk/set-up-the-sdk/securing-your-private-key
  privateKey: process.env.ADMIN_PRIVATE_KEY || "",
  // Set this to your domain to prevent signature malleability attacks.
  domain: "example.com",
});

// Export the handler to setup all your endpoints
export default ThirdwebAuthHandler();
```

Now, on the homepage at `index.tsx`, users can connect their wallet and sign a message that proves their identity using the `ConnectWallet` button:

```tsx
const Home: NextPage = () => {
  return (
    <ConnectWallet
      auth={{
        loginOptional: false,
      }}
      accentColor="#5204BF"
    />
  );
};

export default Home;
```

### Generating Discount Codes

On the client, we make a request to the `api/generate-discount.ts` API route in a `useEffect` block whenever the user signs in to the application:

```tsx
const Home: NextPage = () => {
  const user = useUser();

  const [generatedDiscount, setGeneratedDiscount] = useState<string>("");

  async function generateDiscount() {
    try {
      const response = await fetch("/api/generate-discount", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const { discountCode } = await response.json();

      setGeneratedDiscount(discountCode);
    } catch (error) {
      console.error(error);
      setGeneratedDiscount("Not eligible for discount");
    }
  }

  // Whenever the `user` is available, call the generateDiscount function.
  useEffect(() => {
    if (user.user?.address) {
      generateDiscount();
    }
  }, [user.user?.address]);
};
```

This API route interacts with the Shopify API to generate a discount code for the user after checking their NFT balance.

First, we're going to ensure the user has signed in with their wallet:

```tsx
// Load environment variables
const {
  SHOPIFY_SITE_URL,
  SHOPIFY_ACCESS_TOKEN,
  NFT_COLLECTION_ADDRESS,
  SHOPIFY_DISCOUNT_ID,
} = process.env;

// Grab the current thirdweb auth user (wallet address)
const thirdwebUser = await getUser(req);
// If there is no user, return an error
if (!thirdwebUser) {
  return res.status(401).json({ error: "Unauthorized" });
}
```

Next, we'll connect to the thirdweb SDK and check the balance of the authenticated wallet:

```js
  // Initialize the SDK to check the user's balance
  const sdk = new ThirdwebSDK("goerli");

  // Check the user's balance
  const edition = await sdk.getEdition(NFT_COLLECTION_ADDRESS!);
  // Here, we're checking token ID 0 specifically, just as an example.
  const balance = await edition.balanceOf(thirdwebUser.address, 0);

  // If the user doesn't own any NFTs, return an error
  if (balance.eq(0)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
```

If they aren't authenticated or don't own any NFTs from the collection, we send them a `401 unauthorized response` and don't generate a discount code for them.

Finally, if they _do_ own an NFT, we can make a `POST` request to Shopify to generate a discount code for them:

```js
  // Create a new client for the specified shop.
  const client = new Shopify.Clients.Rest(
    SHOPIFY_SITE_URL!,
    SHOPIFY_ACCESS_TOKEN!
  );

  // Create a new discount code with the Shopify API
  const response = await client.post({
    type: DataType.JSON,
    path: `/admin/api/2022-10/price_rules/${SHOPIFY_DISCOUNT_ID}/discount_codes.json`,
    data: {
      discount_code: {
        code: thirdwebUser.address,
        usage_count: 1,
      },
    },
  });

  res
    .status(200)
    .json({ discountCode: response.body.discount_code.code as string });
```

## Join our Discord!

For any questions or suggestions, join our discord at [https://discord.gg/thirdweb](https://discord.gg/thirdweb).
