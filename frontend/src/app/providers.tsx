"use client";

import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TurnkeyProvider } from "@turnkey/react-wallet-kit";
import { wagmiConfig } from "@/config/wagmi";

const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TurnkeyProvider
      config={{
        authProxyConfigId: process.env.NEXT_PUBLIC_AUTH_PROXY_CONFIG_ID!,
        organizationId: process.env.NEXT_PUBLIC_ORGANIZATION_ID!,
        auth: {
          oauthConfig: { openOauthInPage: true },
          methods: {
            emailOtpAuthEnabled: true,
            smsOtpAuthEnabled: false,
            passkeyAuthEnabled: true,
            walletAuthEnabled: true,
            googleOauthEnabled: true,
            appleOauthEnabled: false,
            facebookOauthEnabled: false,
            xOauthEnabled: false,
            discordOauthEnabled: false,
          },
          methodOrder: ["socials", "email", "sms", "passkey", "wallet"],
        },
        ui: {
          darkMode: true,
          borderRadius: 16,
          backgroundBlur: 8,
          colors: {
            light: {
              primary: "#335bf9",
              modalBackground: "#f5f7fb",
            },
            dark: {
              primary: "#335bf9",
              modalBackground: "#0b0b0b",
            },
          },
        },
      }}
    >
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          {Array.isArray(children)
            ? children.map((child, idx) => <div key={idx}>{child}</div>)
            : children}
        </QueryClientProvider>
      </WagmiProvider>
    </TurnkeyProvider>
  );
}
