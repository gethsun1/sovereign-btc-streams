import Head from "next/head";
import NextLink from "next/link";
import {
  Box,
  Button,
  Container,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  NumberInput,
  NumberInputField,
  Select,
  Text,
  VStack,
  useToast,
} from "@chakra-ui/react";
import axios from "axios";
import { useEffect, useMemo, useState } from "react";
import StreamCard from "@/components/StreamCard";
import { StreamUIModel } from "@/lib/types";
import { computeVestedAmount, nowUnix, satsToBtc } from "@/lib/utils";
import { ProofState } from "@/components/ProofStatus";
import WalletConnectButton from "@/components/WalletConnectButton";
import { useWallet } from "@/lib/wallet";
import { VaultIcon, LightningIcon } from "@/components/icons/StreamIcons";
import { FloatingBitcoinPattern, GlowOrb } from "@/components/decorative/BackgroundElements";

export default function ClaimPage() {
  const toast = useToast();
  const { address, sign } = useWallet();
  const [streams, setStreams] = useState<StreamUIModel[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [amountSats, setAmountSats] = useState<number>(0);
  const [isClaiming, setIsClaiming] = useState(false);
  const [proofState, setProofState] = useState<ProofState>("idle");

  const selectedStream = useMemo(
    () => streams.find((s) => s.id === selectedId),
    [streams, selectedId],
  );

  const claimable = useMemo(() => {
    if (!selectedStream) return 0;
    const vested = computeVestedAmount(
      selectedStream.startUnix,
      selectedStream.cliffUnix,
      selectedStream.rateSatsPerSec,
      selectedStream.totalAmountSats,
      nowUnix(),
    );
    return Math.max(vested - selectedStream.streamedCommitmentSats, 0);
  }, [selectedStream]);

  useEffect(() => {
    axios
      .get("/api/streams")
      .then((res) => {
        setStreams(res.data.streams);
        if (res.data.streams.length > 0) {
          setSelectedId(res.data.streams[0].id);
        }
      })
      .catch(() => toast({ title: "Failed to load streams", status: "error", position: "top" }));
  }, [toast]);

  useEffect(() => {
    if (claimable > 0) {
      setAmountSats(claimable);
    }
  }, [claimable]);

  const submitClaim = async () => {
    if (!selectedStream) return;
    setIsClaiming(true);
    setProofState("generating");
    try {
      const signature = await sign(
        JSON.stringify({
          action: "claimStream",
          walletAddress: address,
          streamId: selectedStream.id,
          amountSats,
        }),
      );
      const res = await axios.post("/api/claimStream", {
        streamId: selectedStream.id,
        claimedAmountSats: amountSats,
        timestamp: nowUnix(),
        walletAddress: address || undefined,
        walletSignature: signature || undefined,
      });
      setProofState("success");
      toast({
        title: "Claim succeeded",
        description: `Claimed ${satsToBtc(res.data.claimedAmountSats).toFixed(8)} BTC`,
        status: "success",
        position: "top",
      });
      // refresh streams to reflect updated commitments
      const refreshed = await axios.get("/api/streams");
      setStreams(refreshed.data.streams);
    } catch (err: any) {
      setProofState("error");
      toast({
        title: "Claim failed",
        description: err?.response?.data?.error ?? "Unknown error",
        status: "error",
        position: "top",
      });
    } finally {
      setIsClaiming(false);
      setTimeout(() => setProofState("idle"), 1500);
    }
  };

  return (
    <>
      <Head>
        <title>Claim Stream | Sovereign BTC Streams</title>
      </Head>
      <Box position="relative" minH="100vh" py={12} overflow="hidden">
        <FloatingBitcoinPattern />
        <GlowOrb top="30%" left="10%" color="#fbbf24" size="500px" />
        
        <Container maxW="5xl" position="relative" zIndex={1}>
          <VStack spacing={8} align="stretch">
            <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
              <Flex align="center" gap={3}>
                <VaultIcon size={32} />
                <Heading
                  size="xl"
                  bgGradient="linear(to-r, bitcoin.400, gold.400)"
                  bgClip="text"
                  fontFamily="heading"
                >
                  Claim Vested BTC
                </Heading>
              </Flex>
              <Flex gap={3}>
                <NextLink href="/">
                  <Button variant="ghost" size="sm">
                    ← Back
                  </Button>
                </NextLink>
                <WalletConnectButton />
              </Flex>
            </Flex>

            <Box
              bg="rgba(26, 20, 16, 0.6)"
              backdropFilter="blur(20px)"
              border="1px solid"
              borderColor="rgba(247, 147, 26, 0.2)"
              borderRadius="2xl"
              p={8}
              boxShadow="0 8px 32px rgba(0, 0, 0, 0.4)"
            >
              <VStack spacing={6} align="stretch">
                <FormControl>
                  <FormLabel color="gray.300" fontWeight="600" fontSize="sm">
                    Select Stream
                  </FormLabel>
                  <Select
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    placeholder="Choose a stream"
                    bg="rgba(26, 20, 16, 0.8)"
                    borderColor="rgba(247, 147, 26, 0.2)"
                    _hover={{ borderColor: "rgba(247, 147, 26, 0.3)" }}
                    _focus={{
                      borderColor: "bitcoin.400",
                      boxShadow: "0 0 0 1px rgba(247, 147, 26, 0.4)",
                    }}
                  >
                    {streams.map((s) => (
                      <option key={s.id} value={s.id} style={{ background: '#1a1410' }}>
                        {s.id.slice(0, 12)}... ({s.status})
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <Box
                  p={4}
                  bg="rgba(247, 147, 26, 0.05)"
                  borderRadius="xl"
                  border="1px solid"
                  borderColor="rgba(247, 147, 26, 0.2)"
                >
                  <Flex justify="space-between" align="center">
                    <Text color="gray.400" fontSize="sm" fontWeight="500">
                      Claimable Now
                    </Text>
                    <VStack align="end" spacing={0}>
                      <Text
                        fontSize="2xl"
                        fontWeight="700"
                        bgGradient="linear(to-r, bitcoin.400, gold.400)"
                        bgClip="text"
                      >
                        ₿ {satsToBtc(claimable).toFixed(8)}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {claimable.toLocaleString()} sats
                      </Text>
                    </VStack>
                  </Flex>
                </Box>

                <FormControl>
                  <FormLabel color="gray.300" fontWeight="600" fontSize="sm">
                    Claim Amount (sats)
                  </FormLabel>
                  <NumberInput
                    min={1}
                    max={claimable}
                    value={amountSats}
                    onChange={(v) => setAmountSats(Number(v))}
                  >
                    <NumberInputField
                      bg="rgba(26, 20, 16, 0.8)"
                      borderColor="rgba(247, 147, 26, 0.2)"
                      _hover={{ borderColor: "rgba(247, 147, 26, 0.3)" }}
                      _focus={{
                        borderColor: "bitcoin.400",
                        boxShadow: "0 0 0 1px rgba(247, 147, 26, 0.4)",
                      }}
                    />
                  </NumberInput>
                </FormControl>

                <Button
                  onClick={submitClaim}
                  isLoading={isClaiming}
                  isDisabled={!selectedStream || claimable <= 0}
                  size="lg"
                  width="full"
                  leftIcon={<LightningIcon size={20} />}
                >
                  Generate Proof & Claim
                </Button>
              </VStack>
            </Box>

            {selectedStream && (
              <StreamCard
                stream={selectedStream}
                claimableSats={claimable}
                onClaim={submitClaim}
                isClaiming={isClaiming}
                proofState={proofState}
              />
            )}
          </VStack>
        </Container>
      </Box>
    </>
  );
}
