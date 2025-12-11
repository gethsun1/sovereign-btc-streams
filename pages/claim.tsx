import Head from "next/head";
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  NumberInput,
  NumberInputField,
  Select,
  Stack,
  Text,
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
      <Box bgGradient="linear(to-b, gray.900, gray.800)" minH="100vh" py={12}>
        <Container maxW="4xl">
          <Stack spacing={8}>
            <Stack direction="row" justify="space-between" align="center">
              <Heading size="lg">Claim vested BTC</Heading>
              <WalletConnectButton />
            </Stack>

            <Box bg="gray.800" border="1px solid" borderColor="gray.700" rounded="xl" p={6}>
              <Stack spacing={4}>
                <FormControl>
                  <FormLabel>Select stream</FormLabel>
                  <Select
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    placeholder="Choose a stream"
                  >
                    {streams.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.id} ({s.status})
                      </option>
                    ))}
                  </Select>
                </FormControl>

                <FormControl>
                  <FormLabel>Claim amount (sats)</FormLabel>
                  <NumberInput
                    min={1}
                    value={amountSats}
                    onChange={(v) => setAmountSats(Number(v))}
                  >
                    <NumberInputField />
                  </NumberInput>
                  <Text fontSize="sm" color="gray.400" mt={1}>
                    Claimable now: {claimable} sats ({satsToBtc(claimable).toFixed(8)} BTC)
                  </Text>
                </FormControl>

                <Button
                  colorScheme="blue"
                  onClick={submitClaim}
                  isLoading={isClaiming}
                  isDisabled={!selectedStream || claimable <= 0}
                >
                  Generate proof & claim
                </Button>
              </Stack>
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
          </Stack>
        </Container>
      </Box>
    </>
  );
}
