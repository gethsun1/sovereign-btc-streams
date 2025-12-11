import {
  Badge,
  Box,
  Button,
  HStack,
  Stack,
  Text,
  useBreakpointValue,
} from "@chakra-ui/react";
import VestingBar from "./VestingBar";
import ProofStatus, { ProofState } from "./ProofStatus";
import { StreamUIModel } from "@/lib/types";
import { satsToBtc } from "@/lib/utils";

type StreamCardProps = {
  stream: StreamUIModel & { claims?: unknown[] };
  claimableSats?: number;
  proofState?: ProofState;
  onClaim?: (streamId: string) => void;
  isClaiming?: boolean;
};

export default function StreamCard({
  stream,
  claimableSats = 0,
  proofState = "idle",
  onClaim,
  isClaiming,
}: StreamCardProps) {
  const statusColor =
    stream.status === "active" ? "green" : stream.status === "completed" ? "blue" : "red";
  const layout = useBreakpointValue({ base: "column", md: "row" });

  return (
    <Box
      p={5}
      bg="gray.800"
      border="1px solid"
      borderColor="gray.700"
      rounded="xl"
      _hover={{ borderColor: "blue.400" }}
      transition="border-color 0.2s ease"
    >
      <Stack spacing={4}>
        <HStack justify="space-between">
          <Text fontWeight="bold">{stream.id}</Text>
          <Badge colorScheme={statusColor}>{stream.status}</Badge>
        </HStack>
        <Stack direction={layout} spacing={4} align={layout === "row" ? "center" : "flex-start"}>
          <Stack spacing={1} minW="220px">
            <Text color="gray.300" fontSize="sm">
              Beneficiary: {stream.beneficiary}
            </Text>
            <Text color="gray.400" fontSize="sm">
              Vault: {stream.vaultId ?? "mock"} | Charm: {stream.charmId ?? "mock"}
            </Text>
            <Text color="gray.400" fontSize="sm">
              Rate: {stream.rateSatsPerSec} sats / sec
            </Text>
            <Text color="gray.400" fontSize="sm">
              Total: {satsToBtc(stream.totalAmountSats).toFixed(8)} BTC
            </Text>
          </Stack>
          <VestingBar
            streamedSats={stream.streamedCommitmentSats}
            totalSats={stream.totalAmountSats}
            label="Vesting"
          />
        </Stack>

        <HStack justify="space-between" flexWrap="wrap" gap={2}>
          <ProofStatus state={proofState} />
          {onClaim && (
            <Button
              size="sm"
              colorScheme="blue"
              onClick={() => onClaim(stream.id)}
              isDisabled={claimableSats <= 0 || stream.status !== "active"}
              isLoading={isClaiming}
            >
              Claim {satsToBtc(Math.max(claimableSats, 0)).toFixed(8)} BTC
            </Button>
          )}
        </HStack>
      </Stack>
    </Box>
  );
}
