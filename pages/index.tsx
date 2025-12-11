import Head from "next/head";
import NextLink from "next/link";
import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  HStack,
  SimpleGrid,
  Spinner,
  Text,
} from "@chakra-ui/react";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import StreamCard from "@/components/StreamCard";
import { StreamUIModel } from "@/lib/types";
import { satsToBtc } from "@/lib/utils";
import WalletConnectButton from "@/components/WalletConnectButton";

export default function Home() {
  const [streams, setStreams] = useState<StreamUIModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    axios
      .get("/api/streams")
      .then((res) => setStreams(res.data.streams))
      .catch(() => setError("Failed to load streams"))
      .finally(() => setLoading(false));
  }, []);

  const totals = useMemo(() => {
    const totalSats = streams.reduce((acc, s) => acc + s.totalAmountSats, 0);
    const active = streams.filter((s) => s.status === "active").length;
    const proofs = streams.reduce((acc, s) => acc + (s.claims?.length ?? 0), 0);
    return { totalSats, active, proofs };
  }, [streams]);

  return (
    <>
      <Head>
        <title>Sovereign BTC Streams</title>
        <meta
          name="description"
          content="Stream BTC with zk-proofs and Charms integration."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Box bgGradient="linear(to-b, gray.900, gray.800)" minH="100vh" py={14}>
        <Container maxW="6xl">
          <Flex direction="column" gap={10}>
            <Flex direction="column" gap={4}>
              <Badge colorScheme="purple" w="fit-content" px={3} py={1}>
                Testnet ready
              </Badge>
              <Heading size="2xl" lineHeight={1.1}>
                Sovereign BTC Streams
              </Heading>
              <WalletConnectButton />
              <Text fontSize="lg" color="gray.200" maxW="3xl">
                Create streaming BTC payouts backed by Grail Pro vaults, minted
                with Charms, and secured by zkBTC proofs. Run everything on
                testnet with fallbacks for offline demos.
              </Text>
              <Flex gap={4} wrap="wrap">
                <NextLink href="/create">
                  <Button colorScheme="blue" size="lg">
                    Create Stream
                  </Button>
                </NextLink>
                <NextLink href="/claim">
                  <Button variant="outline" colorScheme="blue" size="lg">
                    Claim Stream
                  </Button>
                </NextLink>
                <NextLink href="/verify">
                  <Button variant="ghost" colorScheme="blue" size="lg">
                    Verify Proof
                  </Button>
                </NextLink>
              </Flex>
            </Flex>

            <SimpleGrid columns={{ base: 1, md: 3 }} gap={6}>
              <Box bg="gray.800" border="1px solid" borderColor="gray.700" p={5} rounded="lg">
                <Text color="gray.300" fontSize="sm">
                  Vaulted BTC
                </Text>
                <Text fontSize="2xl" fontWeight="bold">
                  {satsToBtc(totals.totalSats).toFixed(4)}
                </Text>
                <Text color="gray.400" fontSize="sm">
                  Across demo vault deposits
                </Text>
              </Box>
              <Box bg="gray.800" border="1px solid" borderColor="gray.700" p={5} rounded="lg">
                <Text color="gray.300" fontSize="sm">
                  Active Streams
                </Text>
                <Text fontSize="2xl" fontWeight="bold">
                  {totals.active}
                </Text>
                <Text color="gray.400" fontSize="sm">
                  Testnet streams with zk verification
                </Text>
              </Box>
              <Box bg="gray.800" border="1px solid" borderColor="gray.700" p={5} rounded="lg">
                <Text color="gray.300" fontSize="sm">
                  Proofs Verified
                </Text>
                <Text fontSize="2xl" fontWeight="bold">
                  {totals.proofs}
                </Text>
                <Text color="gray.400" fontSize="sm">
                  Local verifier + zkBTC testnet
                </Text>
              </Box>
            </SimpleGrid>

            <Box>
              <Heading size="md" mb={4}>
                Demo Streams
              </Heading>
              {error && (
                <Text color="red.300" mb={2}>
                  {error}
                </Text>
              )}
              {loading ? (
                <Flex color="gray.300" align="center" gap={2}>
                  <Spinner size="sm" />
                  <Text>Loading streams...</Text>
                </Flex>
              ) : streams.length === 0 ? (
                <Text color="gray.400">No streams yet. Create one to get started.</Text>
              ) : (
                <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                  {streams.map((stream) => (
                    <StreamCard key={stream.id} stream={stream} />
                  ))}
                </SimpleGrid>
              )}
            </Box>
          </Flex>
        </Container>
      </Box>
    </>
  );
}
