import { Button, HStack, Text } from "@chakra-ui/react";
import { useWallet } from "@/lib/wallet";

export default function WalletConnectButton() {
  const { address, connect, disconnect, connecting, network } = useWallet();
  if (address) {
    return (
      <HStack spacing={3}>
        <Text fontSize="sm" color="gray.300">
          {network} · {shorten(address)}
        </Text>
        <Button size="sm" variant="outline" onClick={disconnect}>
          Disconnect
        </Button>
      </HStack>
    );
  }
  return (
    <Button size="sm" colorScheme="blue" onClick={connect} isLoading={connecting}>
      Connect Xverse
    </Button>
  );
}

function shorten(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
