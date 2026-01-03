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
  Input,
  NumberInput,
  NumberInputField,
  SimpleGrid,
  Text,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { useState } from "react";
import axios from "axios";
import { CreateStreamRequest } from "@/lib/types";
import WalletConnectButton from "@/components/WalletConnectButton";
import { useWallet } from "@/lib/wallet";
import { BitcoinIcon } from "@/components/icons/BitcoinIcon";
import { StreamFlowIcon, CheckCircleIcon } from "@/components/icons/StreamIcons";
import { FloatingBitcoinPattern, GlowOrb } from "@/components/decorative/BackgroundElements";

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
      const errorMessage = err?.response?.data?.error ?? err?.message ?? "Unknown error";
      toast({
        title: "Failed to create stream",
        description: errorMessage,
        status: "error",
        position: "top",
        duration: 5000,
        isClosable: true,
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
      <Box position="relative" minH="100vh" py={12} overflow="hidden">
        <FloatingBitcoinPattern />
        <GlowOrb top="20%" left="80%" color="#f7931a" size="400px" />
        
        <Container maxW="4xl" position="relative" zIndex={1}>
          <VStack spacing={8} align="stretch">
            <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
              <Flex align="center" gap={3}>
                <StreamFlowIcon size={32} />
                <Heading
                  size="xl"
                  bgGradient="linear(to-r, bitcoin.400, gold.400)"
                  bgClip="text"
                  fontFamily="heading"
                >
                  Create a Stream
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
              as="form"
              onSubmit={handleSubmit}
              bg="rgba(26, 20, 16, 0.6)"
              backdropFilter="blur(20px)"
              border="1px solid"
              borderColor="rgba(247, 147, 26, 0.2)"
              borderRadius="2xl"
              p={8}
              boxShadow="0 8px 32px rgba(0, 0, 0, 0.4)"
            >
              <SimpleGrid columns={{ base: 1, md: 2 }} gap={6}>
                <FormControl>
                  <FormLabel color="gray.300" fontWeight="600" fontSize="sm">
                    Total Amount (BTC)
                  </FormLabel>
                  <NumberInput
                    min={0.000001}
                    value={form.totalAmountBtc}
                    onChange={(v) => handleChange("totalAmountBtc", v)}
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
                <FormControl>
                  <FormLabel color="gray.300" fontWeight="600" fontSize="sm">
                    Rate (sats / sec)
                  </FormLabel>
                  <NumberInput
                    min={1}
                    value={form.rateSatsPerSec}
                    onChange={(v) => handleChange("rateSatsPerSec", v)}
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
                <FormControl>
                  <FormLabel color="gray.300" fontWeight="600" fontSize="sm">
                    Start (UTC)
                  </FormLabel>
                  <Input
                    type="datetime-local"
                    value={form.startIso}
                    onChange={(e) => handleChange("startIso", e.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel color="gray.300" fontWeight="600" fontSize="sm">
                    Cliff (UTC)
                  </FormLabel>
                  <Input
                    type="datetime-local"
                    value={form.cliffIso}
                    onChange={(e) => handleChange("cliffIso", e.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel color="gray.300" fontWeight="600" fontSize="sm">
                    Beneficiary (BTC address)
                  </FormLabel>
                  <Input
                    value={form.beneficiary}
                    onChange={(e) => handleChange("beneficiary", e.target.value)}
                    fontFamily="mono"
                    fontSize="sm"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel color="gray.300" fontWeight="600" fontSize="sm">
                    Revocation pubkey
                  </FormLabel>
                  <Input
                    value={form.revocationPubkey}
                    onChange={(e) => handleChange("revocationPubkey", e.target.value)}
                    fontFamily="mono"
                    fontSize="sm"
                  />
                </FormControl>
                <FormControl gridColumn={{ base: "1", md: "1 / -1" }}>
                  <FormLabel color="gray.300" fontWeight="600" fontSize="sm">
                    Policy (optional)
                  </FormLabel>
                  <Input
                    value={form.policy}
                    onChange={(e) => handleChange("policy", e.target.value)}
                  />
                </FormControl>
              </SimpleGrid>
              <Button
                mt={8}
                type="submit"
                isLoading={isSubmitting}
                size="lg"
                width="full"
                leftIcon={<StreamFlowIcon size={20} />}
              >
                Create Stream
              </Button>
            </Box>

            {response && (
              <Box
                bg="rgba(26, 20, 16, 0.6)"
                backdropFilter="blur(20px)"
                border="2px solid"
                borderColor="bitcoin.400"
                borderRadius="2xl"
                p={8}
                boxShadow="0 12px 40px rgba(247, 147, 26, 0.3)"
              >
                <Flex align="center" gap={3} mb={6}>
                  <CheckCircleIcon size={32} />
                  <Heading
                    size="lg"
                    bgGradient="linear(to-r, bitcoin.400, gold.400)"
                    bgClip="text"
                  >
                    Stream Created Successfully!
                  </Heading>
                </Flex>
                <VStack align="stretch" spacing={3}>
                  <Flex justify="space-between" p={3} bg="rgba(10, 10, 10, 0.4)" borderRadius="lg">
                    <Text color="gray.400" fontWeight="500">Stream ID:</Text>
                    <Text color="bitcoin.400" fontFamily="mono" fontSize="sm">{response.streamId}</Text>
                  </Flex>
                  <Flex justify="space-between" p={3} bg="rgba(10, 10, 10, 0.4)" borderRadius="lg">
                    <Text color="gray.400" fontWeight="500">Charm ID:</Text>
                    <Text color="gold.400" fontFamily="mono" fontSize="sm">{response.charmId}</Text>
                  </Flex>
                  <Flex justify="space-between" p={3} bg="rgba(10, 10, 10, 0.4)" borderRadius="lg">
                    <Text color="gray.400" fontWeight="500">Vault ID:</Text>
                    <Text color="bitcoin.400" fontFamily="mono" fontSize="sm">{response.vaultId}</Text>
                  </Flex>
                </VStack>
                <Flex gap={3} mt={6}>
                  <NextLink href="/" style={{ flex: 1 }}>
                    <Button variant="outline" width="full">
                      View Dashboard
                    </Button>
                  </NextLink>
                  <NextLink href="/claim" style={{ flex: 1 }}>
                    <Button width="full">
                      Claim Stream
                    </Button>
                  </NextLink>
                </Flex>
              </Box>
            )}
          </VStack>
        </Container>
      </Box>
    </>
  );
}
