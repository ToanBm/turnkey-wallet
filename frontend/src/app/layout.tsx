import "@turnkey/react-wallet-kit/styles.css";
import "./globals.css";
import Providers from "./providers";
import Header from "@/components/Header";

export const metadata = {
  title: "MetaSwap - Smart Account Wallet",
  description: "MetaSwap - The ultimate Smart Account platform for token swapping. Execute gasless transactions and swap tokens with ease.",
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://api.fontshare.com/v2/css?f[]=satoshi@1,900,700,500,301,701,300,501,401,901,400&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen flex flex-col text-white" style={{ backgroundColor: 'var(--primary-background)' }} suppressHydrationWarning={true}>
        <Providers>
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow py-12">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
