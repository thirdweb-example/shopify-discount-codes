// This API Route uses the Shopify API to generate a discount code for a customer
// First, it checks to see if they own an NFT from a specific collection before generating a discount code
import { ThirdwebSDK } from "@thirdweb-dev/sdk";
import type { NextApiRequest, NextApiResponse } from "next";
import { getUser } from "./auth/[...thirdweb]";
import Shopify, { DataType } from "@shopify/shopify-api";

export default async function generateDiscount(
  req: NextApiRequest,
  res: NextApiResponse
) {
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
}
