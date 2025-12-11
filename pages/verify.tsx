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
  Stack,
  Text,
  Textarea,
  useToast,
} from "@chakra-ui/react";
import axios from "axios";
import { useState } from "react";
import { nowUnix } from "@/lib/utils";

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
      <Box bgGradient="linear(to-b, gray.900, gray.800)" minH="100vh" py={12}>
        <Container maxW="3xl">
          <Stack spacing={8}>
            <Heading size="lg">Audit zkBTC proofs</Heading>
            <Box bg="gray.800" border="1px solid" borderColor="gray.700" rounded="xl" p={6}>
              <Stack spacing={4}>
                <FormControl>
                  <FormLabel>Stream ID</FormLabel>
                  <Textarea
                    placeholder="stream_..."
                    value={streamId}
                    onChange={(e) => setStreamId(e.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Claimed amount (sats)</FormLabel>
                  <NumberInput
                    min={1}
                    value={claimedAmountSats}
                    onChange={(v) => setClaimedAmountSats(Number(v))}
                  >
                    <NumberInputField />
                  </NumberInput>
                </FormControl>
                <FormControl>
                  <FormLabel>Proof JSON</FormLabel>
                  <Textarea
                    placeholder='{"proof": "..."}'
                    minH="140px"
                    value={proofText}
                    onChange={(e) => setProofText(e.target.value)}
                  />
                </FormControl>
                <Button colorScheme="blue" onClick={handleVerify} isLoading={isVerifying}>
                  Verify proof
                </Button>
              </Stack>
            </Box>

            {result && (
              <Box bg="gray.800" border="1px solid" borderColor="gray.700" rounded="xl" p={6}>
                <Heading size="md" mb={3}>
                  Verification Result
                </Heading>
                <Text color="gray.300">Valid: {result.verification.valid ? "true" : "false"}</Text>
                <Text color="gray.300">Digest: {result.verification.digest}</Text>
                <Text color="gray.300">Verified via: {result.verification.via}</Text>
              </Box>
            )}
          </Stack>
        </Container>
      </Box>
    </>
  );
}
