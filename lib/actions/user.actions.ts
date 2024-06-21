"use server";

import { ID } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { cookies } from "next/headers";
import { parseStringify } from "../utils";

export const signUp = async (userData: SignUpParams) => {
  const { email, password, firstName, lastName } = userData;
  try {
    const { account } = await createAdminClient();

    const newUserAccount = await account.create(
      ID.unique(),
      email,
      password,
      `${firstName} ${lastName}`
    );
    const session = await account.createEmailPasswordSession(email, password);
    cookies().set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });
    //we stringify the object first, because in NextJs you can't pass large objects from NextJS server (actions) to client(front-end)
    return parseStringify(newUserAccount);
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
