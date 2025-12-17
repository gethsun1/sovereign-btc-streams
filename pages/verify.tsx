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
  Text,
  Textarea,
  VStack,
  useToast,
} from "@chakra-ui/react";
import axios from "axios";
import { useState } from "react";
import { nowUnix } from "@/lib/utils";
import { CheckCircleIcon } from "@/components/icons/StreamIcons";
import { FloatingBitcoinPattern, GlowOrb } from "@/components/decorative/BackgroundElements";

export default function VerifyPage() {
  const toast = useToast();
  const [streamId, setStreamId] = useState("");
  const [claimedAmountSats, setClaimedAmountSats] = useState<number>(0);
  const [proofText, setProofText] = useState<string>("");
  const [result, setResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      const proof = proofText ? JSON.parse(proofText) : {};
      const res = await axios.post("/api/verifyProof", {
        streamId,
        proof,
        claimedAmountSats,
        timestamp: nowUnix(),
      });
      setResult(res.data);
      toast({ title: "Proof verified", status: "success", position: "top" });
    } catch (err: any) {
      toast({
        title: "Verification failed",
        description: err?.response?.data?.error ?? "Invalid proof JSON or request",
        status: "error",
        position: "top",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <>
      <Head>
        <title>Verify Proof | Sovereign BTC Streams</title>
      </Head>
      <Box position="relative" minH="100vh" py={12} overflow="hidden">
        <FloatingBitcoinPattern />
        <GlowOrb top="40%" left="70%" color="#f7931a" size="450px" />
        
        <Container maxW="4xl" position="relative" zIndex={1}>
          <VStack spacing={8} align="stretch">
            <Flex justify="space-between" align="center" flexWrap="wrap" gap={4}>
              <Flex align="center" gap={3}>
                <CheckCircleIcon size={32} />
                <Heading
                  size="xl"
                  bgGradient="linear(to-r, bitcoin.400, gold.400)"
                  bgClip="text"
                  fontFamily="heading"
                >
                  Audit zkBTC Proofs
                </Heading>
              </Flex>
              <NextLink href="/">
                <Button variant="ghost" size="sm">
                  ← Back
                </Button>
              </NextLink>
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
                    Stream ID
                  </FormLabel>
                  <Input
                    placeholder="stream_..."
                    value={streamId}
                    onChange={(e) => setStreamId(e.target.value)}
                    fontFamily="mono"
                    fontSize="sm"
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel color="gray.300" fontWeight="600" fontSize="sm">
                    Claimed Amount (sats)
                  </FormLabel>
                  <NumberInput
                    min={1}
                    value={claimedAmountSats}
                    onChange={(v) => setClaimedAmountSats(Number(v))}
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
                    Proof JSON
                  </FormLabel>
                  <Textarea
                    placeholder='{"proof": "..."}'
                    minH="180px"
                    value={proofText}
                    onChange={(e) => setProofText(e.target.value)}
                    fontFamily="mono"
                    fontSize="sm"
                    bg="rgba(26, 20, 16, 0.8)"
                    borderColor="rgba(247, 147, 26, 0.2)"
                    _hover={{ borderColor: "rgba(247, 147, 26, 0.3)" }}
                    _focus={{
                      borderColor: "bitcoin.400",
                      boxShadow: "0 0 0 1px rgba(247, 147, 26, 0.4)",
                    }}
                  />
                </FormControl>
                
                <Button
                  onClick={handleVerify}
                  isLoading={isVerifying}
                  size="lg"
                  width="full"
                  leftIcon={<CheckCircleIcon size={20} />}
                >
                  Verify Proof
                </Button>
              </VStack>
            </Box>

            {result && (
              <Box
                bg="rgba(26, 20, 16, 0.6)"
                backdropFilter="blur(20px)"
                border="2px solid"
                borderColor={result.verification.valid ? "bitcoin.400" : "red.500"}
                borderRadius="2xl"
                p={8}
                boxShadow={result.verification.valid 
                  ? "0 12px 40px rgba(247, 147, 26, 0.3)" 
                  : "0 12px 40px rgba(220, 38, 38, 0.3)"
                }
              >
                <Flex align="center" gap={3} mb={6}>
                  <CheckCircleIcon size={32} />
                  <Heading
                    size="lg"
                    bgGradient={result.verification.valid 
                      ? "linear(to-r, bitcoin.400, gold.400)" 
                      : "linear(to-r, red.400, red.600)"
                    }
                    bgClip="text"
                  >
                    Verification Result
                  </Heading>
                </Flex>
                
                <VStack align="stretch" spacing={3}>
                  <Flex justify="space-between" p={3} bg="rgba(10, 10, 10, 0.4)" borderRadius="lg">
                    <Text color="gray.400" fontWeight="500">Status:</Text>
                    <Text 
                      color={result.verification.valid ? "bitcoin.400" : "red.400"} 
                      fontWeight="700"
                      textTransform="uppercase"
                    >
                      {result.verification.valid ? "VALID ✓" : "INVALID ✗"}
                    </Text>
                  </Flex>
                  
                  <Flex justify="space-between" p={3} bg="rgba(10, 10, 10, 0.4)" borderRadius="lg">
                    <Text color="gray.400" fontWeight="500">Digest:</Text>
                    <Text color="gray.300" fontFamily="mono" fontSize="sm">
                      {result.verification.digest}
                    </Text>
                  </Flex>
                  
                  <Flex justify="space-between" p={3} bg="rgba(10, 10, 10, 0.4)" borderRadius="lg">
                    <Text color="gray.400" fontWeight="500">Verified via:</Text>
                    <Text color="gold.400" fontWeight="600">
                      {result.verification.via}
                    </Text>
                  </Flex>
                </VStack>
              </Box>
            )}
          </VStack>
        </Container>
      </Box>
    </>
  );
}
