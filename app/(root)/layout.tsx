import MobileNav from "@/components/MobileNav";
import Sidebar from "@/components/Sidebar";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import Image from "next/image";
import { redirect } from "next/navigation";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const loggedInUser = await getLoggedInUser();
  if (!loggedInUser) redirect("/sign-in");

  return (
    <main className="w-full h-screen font-inter flex">
      {/* Sidebar for desktop */}
      <Sidebar user={loggedInUser} />
      {/* Sidebar for mobil */}
      <div className="flex flex-col size-full">
        <div className="root-layout">
          <Image src="icons/logo.svg" alt="logo" width={30} height={30} />
          <div>
            <MobileNav user={loggedInUser} />
          </div>
        </div>
        {children}
      </div>
    </main>
  );
}
