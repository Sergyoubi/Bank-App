import { useCallback, useEffect, useState } from "react";
import { Button } from "./ui/button";
import {
  PlaidLinkOnSuccess,
  PlaidLinkOptions,
  usePlaidLink,
} from "react-plaid-link";
import { useRouter } from "next/navigation";
import {
  createLinkToken,
  exchangePublicToken,
} from "@/lib/actions/user.actions";

const PlaidLink = ({ user, variant }: PlaidLinkProps) => {
  const router = useRouter();
  const [token, setToken] = useState("");

  // this fn allows existing/logged_in user to connect to plaid through a "Token"
  const getLinkToken = async () => {
    const data = await createLinkToken(user);
    setToken(data?.linkToken);
  };
  useEffect(() => {
    getLinkToken();
  }, []);

  //whenever the user changes, we run this fn() when user successfully link an item
  const onSuccess = useCallback<PlaidLinkOnSuccess>(
    async (public_token: String) => {
      // link to a bank account
      await exchangePublicToken({
        publicToken: public_token,
        user,
      });

      router.push("/");
    },
    [user]
  );

  const config: PlaidLinkOptions = { token, onSuccess };

  const { open, ready } = usePlaidLink(config);

  return (
    <>
      {variant === "primary" ? (
        <Button
          onClick={() => open()}
          disabled={!ready}
          className="bg-blue-500 text-white"
        >
          Connect Bank
        </Button>
      ) : variant === "ghost" ? (
        <Button>Connect Bank</Button>
      ) : (
        <Button>Connect Bank</Button>
      )}
    </>
  );
};

export default PlaidLink;
