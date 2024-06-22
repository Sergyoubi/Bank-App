import { useCallback, useEffect, useState } from "react";
import { Button } from "./ui/button";
import { PlaidLinkOptions } from "react-plaid-link";
import { useRouter } from "next/navigation";

const PlaidLink = ({ user, variant }: PlaidLinkProps) => {
  const router = useRouter();
  const [token, setToken] = useState("");
  // this fn allow to connect our existing/logged_in user to plaid through a "Token"
  /*
  const getLinkToken = async () => {
    const data = await createLinkToken(user)
    setToken(data?.linkToken)
  }
  useEffect(() => {
    getLinkToken()
  }, [])
  */

  //whenever the user changes, we run this fn() when user successfully link an item
  const onSuccess = useCallback(
    async (public_token: String) => {
      // link to a bank account
      /*
    await exchangePublicToken({
      publicToken:public_token, user 
    })
    */
      router.push("/");
    },
    [user]
  );

  const config: PlaidLinkOptions = { token, onSuccess };

  return (
    <>
      {variant === "primary" ? (
        <Button className="plaidLink-primary">Connect Bank</Button>
      ) : variant === "ghost" ? (
        <Button>Connect Bank</Button>
      ) : (
        <Button>Connect Bank</Button>
      )}
    </>
  );
};

export default PlaidLink;
