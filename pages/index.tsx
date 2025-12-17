import Head from "next/head";
import NextLink from "next/link";
import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  SimpleGrid,
  Spinner,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Text,
  VStack,
} from "@chakra-ui/react";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import StreamCard from "@/components/StreamCard";
import { StreamUIModel } from "@/lib/types";
import { satsToBtc } from "@/lib/utils";
import WalletConnectButton from "@/components/WalletConnectButton";
import { BitcoinIcon } from "@/components/icons/BitcoinIcon";
import { StreamFlowIcon, VaultIcon, CheckCircleIcon } from "@/components/icons/StreamIcons";
import { FloatingBitcoinPattern, GlowOrb, GridPattern } from "@/components/decorative/BackgroundElements";

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
        <title>Sovereign BTC Streams - Premium Bitcoin Streaming</title>
        <meta
          name="description"
          content="Stream BTC with zk-proofs and Charms integration. Premium Bitcoin streaming platform."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Box position="relative" minH="100vh" py={14} overflow="hidden">
        <FloatingBitcoinPattern />
        <GridPattern />
        <GlowOrb top="10%" left="10%" color="#f7931a" size="500px" />
        <GlowOrb top="60%" left="70%" color="#fbbf24" size="600px" />
        
        <Container maxW="7xl" position="relative" zIndex={1}>
          <VStack spacing={12} align="stretch">
            <Flex direction="column" gap={6} align="center" textAlign="center">
              <Box
                bg="rgba(26, 20, 16, 0.6)"
                backdropFilter="blur(20px)"
                px={4}
                py={2}
                borderRadius="full"
                border="1px solid"
                borderColor="rgba(247, 147, 26, 0.3)"
                display="inline-flex"
                alignItems="center"
                gap={2}
              >
                <Box w="8px" h="8px" borderRadius="full" bg="bitcoin.400" animation="pulse 2s ease-in-out infinite" />
                <Text fontSize="sm" fontWeight="600" color="bitcoin.400" textTransform="uppercase" letterSpacing="wide">
                  Testnet Ready
                </Text>
              </Box>
              
              <Flex align="center" gap={4}>
                <BitcoinIcon size={60} animate glow />
                <Heading
                  size="3xl"
                  bgGradient="linear(to-r, bitcoin.400, gold.400)"
                  bgClip="text"
                  fontFamily="heading"
                  letterSpacing="tight"
                >
                  Sovereign BTC Streams
                </Heading>
              </Flex>
              
              <Text fontSize="xl" color="gray.300" maxW="4xl" lineHeight="tall">
                Create streaming BTC payouts backed by <Text as="span" color="bitcoin.400" fontWeight="600">Grail Pro vaults</Text>,
                minted with <Text as="span" color="gold.400" fontWeight="600">Charms</Text>, and secured by{" "}
                <Text as="span" color="bitcoin.400" fontWeight="600">zkBTC proofs</Text>.
              </Text>
              
              <WalletConnectButton />
              <Flex gap={4} wrap="wrap" justify="center">
                <NextLink href="/create">
                  <Button
                    size="lg"
                    px={8}
                    py={6}
                    fontSize="md"
                    leftIcon={<StreamFlowIcon size={20} />}
                  >
                    Create Stream
                  </Button>
                </NextLink>
                <NextLink href="/claim">
                  <Button
                    variant="outline"
                    size="lg"
                    px={8}
                    py={6}
                    fontSize="md"
                    leftIcon={<VaultIcon size={20} />}
                  >
                    Claim Stream
                  </Button>
                </NextLink>
                <NextLink href="/verify">
                  <Button
                    variant="ghost"
                    size="lg"
                    px={8}
                    py={6}
                    fontSize="md"
                    leftIcon={<CheckCircleIcon size={20} />}
                  >
                    Verify Proof
                  </Button>
                </NextLink>
              </Flex>
            </Flex>

            <SimpleGrid columns={{ base: 1, md: 3 }} gap={6}>
              <Stat
                bg="rgba(26, 20, 16, 0.6)"
                backdropFilter="blur(20px)"
                p={8}
                borderRadius="2xl"
                border="1px solid"
                borderColor="rgba(247, 147, 26, 0.2)"
                transition="all 0.3s"
                _hover={{
                  borderColor: "rgba(247, 147, 26, 0.4)",
                  transform: "translateY(-4px)",
                  boxShadow: "0 12px 40px rgba(247, 147, 26, 0.2)",
                }}
              >
                <Flex align="center" gap={3} mb={3}>
                  <VaultIcon size={24} />
                  <StatLabel>Vaulted BTC</StatLabel>
                </Flex>
                <StatNumber fontSize="4xl" bgGradient="linear(to-r, bitcoin.400, gold.400)" bgClip="text">
                  ₿ {satsToBtc(totals.totalSats).toFixed(4)}
                </StatNumber>
                <StatHelpText color="gray.400" mt={2}>
                  Across demo vault deposits
                </StatHelpText>
              </Stat>
              
              <Stat
                bg="rgba(26, 20, 16, 0.6)"
                backdropFilter="blur(20px)"
                p={8}
                borderRadius="2xl"
                border="1px solid"
                borderColor="rgba(247, 147, 26, 0.2)"
                transition="all 0.3s"
                _hover={{
                  borderColor: "rgba(247, 147, 26, 0.4)",
                  transform: "translateY(-4px)",
                  boxShadow: "0 12px 40px rgba(247, 147, 26, 0.2)",
                }}
              >
                <Flex align="center" gap={3} mb={3}>
                  <StreamFlowIcon size={24} />
                  <StatLabel>Active Streams</StatLabel>
                </Flex>
                <StatNumber fontSize="4xl" bgGradient="linear(to-r, bitcoin.400, gold.400)" bgClip="text">
                  {totals.active}
                </StatNumber>
                <StatHelpText color="gray.400" mt={2}>
                  Testnet streams with zk verification
                </StatHelpText>
              </Stat>
              
              <Stat
                bg="rgba(26, 20, 16, 0.6)"
                backdropFilter="blur(20px)"
                p={8}
                borderRadius="2xl"
                border="1px solid"
                borderColor="rgba(247, 147, 26, 0.2)"
                transition="all 0.3s"
                _hover={{
                  borderColor: "rgba(247, 147, 26, 0.4)",
                  transform: "translateY(-4px)",
                  boxShadow: "0 12px 40px rgba(247, 147, 26, 0.2)",
                }}
              >
                <Flex align="center" gap={3} mb={3}>
                  <CheckCircleIcon size={24} />
                  <StatLabel>Proofs Verified</StatLabel>
                </Flex>
                <StatNumber fontSize="4xl" bgGradient="linear(to-r, bitcoin.400, gold.400)" bgClip="text">
                  {totals.proofs}
                </StatNumber>
                <StatHelpText color="gray.400" mt={2}>
                  Local verifier + zkBTC testnet
                </StatHelpText>
              </Stat>
            </SimpleGrid>

            <Box>
              <Flex align="center" gap={3} mb={6}>
                <Box w="4px" h="8" bg="bitcoin.400" borderRadius="full" />
                <Heading
                  size="lg"
                  bgGradient="linear(to-r, bitcoin.400, gold.400)"
                  bgClip="text"
                  fontFamily="heading"
                >
                  Active Streams
                </Heading>
              </Flex>
              
              {error && (
                <Box
                  bg="rgba(220, 38, 38, 0.1)"
                  border="1px solid"
                  borderColor="red.500"
                  p={4}
                  borderRadius="xl"
                  mb={4}
                >
                  <Text color="red.300">{error}</Text>
                </Box>
              )}
              
              {loading ? (
                <Flex
                  align="center"
                  justify="center"
                  gap={3}
                  py={12}
                  bg="rgba(26, 20, 16, 0.4)"
                  borderRadius="2xl"
                  border="1px solid"
                  borderColor="rgba(247, 147, 26, 0.1)"
                >
                  <Spinner size="md" color="bitcoin.400" thickness="3px" />
                  <Text color="gray.300" fontSize="lg">Loading streams...</Text>
                </Flex>
              ) : streams.length === 0 ? (
                <Flex
                  direction="column"
                  align="center"
                  justify="center"
                  gap={4}
                  py={16}
                  bg="rgba(26, 20, 16, 0.4)"
                  borderRadius="2xl"
                  border="2px dashed"
                  borderColor="rgba(247, 147, 26, 0.2)"
                >
                  <BitcoinIcon size={80} glow />
                  <Text color="gray.400" fontSize="lg">No streams yet. Create one to get started.</Text>
                  <NextLink href="/create">
                    <Button size="lg" leftIcon={<StreamFlowIcon size={20} />}>
                      Create Your First Stream
                    </Button>
                  </NextLink>
                </Flex>
              ) : (
                <SimpleGrid columns={{ base: 1, lg: 2 }} gap={6}>
                  {streams.map((stream) => (
                    <StreamCard key={stream.id} stream={stream} />
                  ))}
                </SimpleGrid>
              )}
            </Box>
          </VStack>
        </Container>
      </Box>
    </>
  );
}
