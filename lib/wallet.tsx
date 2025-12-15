import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { AddressPurpose, request, signMessage, BitcoinNetworkType } from "@sats-connect/core";

type WalletContextValue = {
  address: string | null;
  network: BitcoinNetworkType;
  connecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  sign: (message: string) => Promise<string | null>;
};

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

const network = { type: BitcoinNetworkType.Testnet };
const appInfo = { name: "Sovereign BTC Streams" };

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  const connect = useCallback(async () => {
    if (typeof window === "undefined") return;
    setConnecting(true);
    try {
      const res = await request("getAccounts", {
        purposes: [AddressPurpose.Ordinals, AddressPurpose.Payment],
        message: "Connect to Sovereign BTC Streams",
      });

      if (res.status === "success") {
        const first = res.result?.[0];
        if (first?.address) {
          setAddress(first.address);
        }
      }
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => setAddress(null), []);

  const sign = useCallback(
    async (message: string) => {
      if (typeof window === "undefined") return null;
      if (!address) {
        return `mock-signature-${message}-${crypto.randomUUID?.() ?? Math.random()}`;
      }
      return new Promise<string | null>((resolve) => {
        void signMessage({
          payload: {
            network,
            address,
            message,
          },
          onFinish: (signature) => resolve(signature),
          onCancel: () => resolve(null),
        });
      });
    },
    [address],
  );

  const value = useMemo(
    () => ({ address, network: network.type, connecting, connect, disconnect, sign }),
    [address, connecting, connect, disconnect, sign],
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return ctx;
}
