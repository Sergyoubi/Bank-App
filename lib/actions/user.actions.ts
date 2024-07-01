"use server";

import { ID } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { cookies } from "next/headers";
import { encryptId, extractCustomerIdFromUrl, parseStringify } from "../utils";
import {
  CountryCode,
  ProcessorTokenCreateRequest,
  ProcessorTokenCreateRequestProcessorEnum,
  Products,
} from "plaid";
import { plaidClient } from "../plaid";
import { revalidatePath } from "next/cache";
import { addFundingSource, createDwollaCustomer } from "./dwolla.actions";

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_USER_COLLECTION_ID: USER_COLLECTION_ID,
  APPWRITE_BANK_COLLECTION_ID: BANK_COLLECTION_ID,
} = process.env;

// here we extract the password from props data at begining! That way userData doesn't have password
export const signUp = async ({ password, ...userData }: SignUpParams) => {
  const { email, firstName, lastName } = userData;
  let newUserAccount;

  try {
    const { account, database } = await createAdminClient();

    newUserAccount = await account.create(
      ID.unique(),
      email,
      password,
      `${firstName} ${lastName}`
    );

    if (!newUserAccount) throw new Error("Error creating new User");

    // then, we create a Dwolla customer url
    const dwollaCustomerUrl = await createDwollaCustomer({
      ...userData,
      type: "personal",
    });

    if (!dwollaCustomerUrl) throw new Error("Error creating Dwolla customer");

    //then, we extract dwolla customer Id
    const dwollaCustomerId = extractCustomerIdFromUrl(dwollaCustomerUrl);

    //we store a new user document in the database
    const newUser = await database.createDocument(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      ID.unique(),
      {
        ...userData,
        userId: newUserAccount.$id,
        dwollaCustomerId,
        dwollaCustomerUrl,
      }
    );

    const session = await account.createEmailPasswordSession(email, password);

    cookies().set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });
    //we stringify the object first, because in NextJs you can't pass large objects from NextJS server (actions) to client(front-end)
    return parseStringify(newUser);
  } catch (error) {
    console.error(`Error from signUp(): ${error}`);
  }
};

export const signIn = async ({ email, password }: signInProps) => {
  // email & password props are sent/passed from AuthForm.tsx
  try {
    const { account } = await createAdminClient();
    const response = await account.createEmailPasswordSession(email, password);

    return parseStringify(response);
  } catch (error) {
    console.error(`Error from signIn(): ${error}`);
  }
};

export async function getLoggedInUser() {
  try {
    const { account } = await createSessionClient();
    const user = await account.get();

    return parseStringify(user);
  } catch (error) {
    console.error(`Error! Can't get logged in user:  ${error}`);
    return null;
  }
}

export const logOutAccount = async () => {
  try {
    const { account } = await createSessionClient();
    cookies().delete("appwrite-session");

    await account.deleteSession("current");
  } catch (error) {
    console.error(`error from logOutAccount(): ${error}`);
  }
};

export const createLinkToken = async (user: User) => {
  try {
    const tokenParams = {
      user: { client_user_id: user.$id },
      client_name: `${user.firstName} ${user.lastName}`,
      products: ["auth"] as Products[],
      language: "en",
      country_codes: ["US"] as CountryCode[],
    };
    const response = await plaidClient.linkTokenCreate(tokenParams);

    return parseStringify({ linkToken: response.data.link_token });
  } catch (error) {
    console.error(`Error from createLinkToken(): ${error}`);
  }
};

// createBankAccount() here is to create record within our Database in Appwrite, after each transaction
export const createBankAccount = async ({
  userId,
  bankId: itemId,
  accountId,
  accessToken,
  fundingSourceUrl,
  sharableId,
}: createBankAccountProps) => {
  try {
    const { database } = await createAdminClient();

    const bankAccount = await database.createDocument(
      DATABASE_ID!, // exclamation mark means that we know it exists so TS will ignore it
      BANK_COLLECTION_ID!,
      ID.unique(),
      {
        userId,
        bankId: itemId,
        accountId,
        accessToken,
        fundingSourceUrl,
        sharableId,
      }
    );

    return parseStringify(bankAccount);
  } catch (error) {}
};

// this fn() exchanges our existing token for a token that llows us to do Banking stuff(money transfer,...)
export const exchangePublicToken = async ({
  publicToken,
  user,
}: exchangePublicTokenProps) => {
  try {
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });
    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;
    //Get account informations from plaid using access token
    const accountResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });
    const accountData = accountResponse.data.accounts[0];

    //now we create a processor token for Dwolla
    //Dwolla is a payment processor we'll be using for our money through plaid on our platform
    const request: ProcessorTokenCreateRequest = {
      access_token: accessToken,
      account_id: accountData.account_id,
      processor: "dwolla" as ProcessorTokenCreateRequestProcessorEnum,
    };
    const processorTokenResponse = await plaidClient.processorTokenCreate(
      request
    );
    const processorToken = processorTokenResponse.data.processor_token;

    // create a funding source URL for the account using Dwolla customer ID, processor Token and Bank name
    // addFundingSource() is aserver action coming from Dwolla. This fn() connects payment processing (Dwolla) functionality to # Bank accounts to send or receive fund$
    const fundingSourceUrl = await addFundingSource({
      dwollaCustomerId: user.dwollaCustomerId,
      processorToken,
      bankName: accountData.name,
    });

    // if the funding source URL is not created, throw an error
    if (!fundingSourceUrl) throw Error;

    //then, we create a bank account using the user ID, item ID, account ID, access token, founding source url and sharable ID
    await createBankAccount({
      userId: user.$id,
      bankId: itemId,
      accountId: accountData.account_id,
      accessToken,
      fundingSourceUrl,
      sharableId: encryptId(accountData.account_id),
    });

    // After creating a bank accout, we revalidate the path to reflect changes which allow us to see the new account we creted
    // (This function allows you to purge cached data on-demand for a specific path)
    revalidatePath("/");

    // return a success message
    return parseStringify({
      publicTokenExchange: "complete",
    });
  } catch (error) {
    console.error(
      `Error occured from exchangePublicToken(), while creating exchange token: "${error}"`
    );
  }
};

// "Server actions" are async functions that are executed on the server.
// They can be used in Client or Server components to handle form submissions and data mutation in NextJS app
// Thy can be defined with ´use server´ directive at top of function/file to mark the fn as Server actions:

/*
const App = () => {
  ------
  async function create(){
    "use server"
    ....
    ....
  }
}
*/
