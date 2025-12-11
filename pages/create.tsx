import Head from "next/head";
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Heading,
  Input,
  NumberInput,
  NumberInputField,
  SimpleGrid,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useState } from "react";
import axios from "axios";
import { CreateStreamRequest } from "@/lib/types";
import WalletConnectButton from "@/components/WalletConnectButton";
import { useWallet } from "@/lib/wallet";

const nowIso = () => new Date().toISOString().slice(0, 16);

export default function CreateStreamPage() {
  const toast = useToast();
  const { address, sign } = useWallet();
  const [isSubmitting, setSubmitting] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [form, setForm] = useState({
    totalAmountBtc: 0.01,
    rateSatsPerSec: 500,
    startIso: nowIso(),
    cliffIso: nowIso(),
    beneficiary: "bc1qdemoaddress",
    revocationPubkey: "revoker_pubkey_testnet",
    policy: "standard",
  });

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: CreateStreamRequest = {
        totalAmountBtc: Number(form.totalAmountBtc),
        rateSatsPerSec: Number(form.rateSatsPerSec),
        startUnix: Math.floor(new Date(form.startIso).getTime() / 1000),
        cliffUnix: Math.floor(new Date(form.cliffIso).getTime() / 1000),
        beneficiary: form.beneficiary,
        revocationPubkey: form.revocationPubkey,
        policy: form.policy,
        walletAddress: address || undefined,
      };
      const signature = await sign(
        JSON.stringify({ action: "createStream", walletAddress: address, payload }),
      );
      if (signature) {
        payload.walletSignature = signature;
      }
      const res = await axios.post("/api/createStream", payload);
      setResponse(res.data);
      toast({ title: "Stream created", status: "success", position: "top" });
    } catch (err: any) {
      toast({
        title: "Failed to create stream",
        description: err?.response?.data?.error ?? "Unknown error",
        status: "error",
        position: "top",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Create Stream | Sovereign BTC Streams</title>
      </Head>
      <Box bgGradient="linear(to-b, gray.900, gray.800)" minH="100vh" py={12}>
        <Container maxW="3xl">
          <Stack spacing={8}>
            <Stack direction="row" justify="space-between" align="center">
              <Heading size="lg">Create a Stream</Heading>
              <WalletConnectButton />
            </Stack>
            <Box
              as="form"
              onSubmit={handleSubmit}
              bg="gray.800"
              border="1px solid"
              borderColor="gray.700"
              rounded="xl"
              p={6}
              shadow="lg"
            >
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
                <FormControl>
                  <FormLabel>Total Amount (BTC)</FormLabel>
                  <NumberInput
                    min={0.000001}
                    value={form.totalAmountBtc}
                    onChange={(v) => handleChange("totalAmountBtc", v)}
                  >
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl>
                  <FormLabel>Rate (sats / sec)</FormLabel>
                  <NumberInput
                    min={1}
                    value={form.rateSatsPerSec}
                    onChange={(v) => handleChange("rateSatsPerSec", v)}
                  >
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl>
                  <FormLabel>Start (UTC)</FormLabel>
                  <Input
                    type="datetime-local"
                    value={form.startIso}
                    onChange={(e) => handleChange("startIso", e.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Cliff (UTC)</FormLabel>
                  <Input
                    type="datetime-local"
                    value={form.cliffIso}
                    onChange={(e) => handleChange("cliffIso", e.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Beneficiary (BTC address)</FormLabel>
                  <Input
                    value={form.beneficiary}
                    onChange={(e) => handleChange("beneficiary", e.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Revocation pubkey</FormLabel>
                  <Input
                    value={form.revocationPubkey}
                    onChange={(e) => handleChange("revocationPubkey", e.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Policy (optional)</FormLabel>
                  <Input
                    value={form.policy}
                    onChange={(e) => handleChange("policy", e.target.value)}
                  />
                </FormControl>
              </SimpleGrid>
              <Button mt={6} colorScheme="blue" type="submit" isLoading={isSubmitting}>
                Create Stream
              </Button>
            </Box>

            {response && (
              <Box
                bg="gray.800"
                border="1px solid"
                borderColor="gray.700"
                rounded="xl"
                p={6}
              >
                <Heading size="md" mb={3}>
                  Stream Created
                </Heading>
                <Text color="gray.300">Stream ID: {response.streamId}</Text>
                <Text color="gray.300">Charm ID: {response.charmId}</Text>
                <Text color="gray.300">Vault ID: {response.vaultId}</Text>
              </Box>
            )}
          </Stack>
        </Container>
      </Box>
    </>
  );
}
