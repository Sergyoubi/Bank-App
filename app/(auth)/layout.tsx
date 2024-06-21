import Image from "next/image";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="w-screen h-screen flex">
      <div className="w-full h-full flex justify-center items-start overflow-scroll">
        {children}
      </div>
      <div className="w-full h-full flex justify-end items-center bg-blue-50">
        <Image
          src="/icons/auth-image.svg"
          alt="Auth image"
          width={400}
          height={400}
        />
      </div>
    </main>
  );
}

/*
{children}
<div className="auth-asset">
  <div>
    <Image
      src="/icons/auth-image.svg"
      alt="Auth image"
      width={400}
      height={400}
    />
  </div>
</div>
*/
