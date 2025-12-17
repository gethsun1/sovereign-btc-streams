import {
  Badge,
  Box,
  Button,
  Flex,
  HStack,
  Stack,
  StackDirection,
  Text,
  VStack,
  useBreakpointValue,
} from "@chakra-ui/react";
import VestingBar from "./VestingBar";
import ProofStatus, { ProofState } from "./ProofStatus";
import { StreamUIModel } from "@/lib/types";
import { satsToBtc } from "@/lib/utils";
import { BitcoinSymbol } from "./icons/BitcoinIcon";
import { VaultIcon, ClockIcon } from "./icons/StreamIcons";

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
    stream.status === "active" ? "bitcoin" : stream.status === "completed" ? "gold" : "red";
  const layout = useBreakpointValue<StackDirection>({ base: "column", md: "row" });
  
  const statusBg = stream.status === "active" 
    ? "rgba(247, 147, 26, 0.15)" 
    : stream.status === "completed" 
    ? "rgba(251, 191, 36, 0.15)" 
    : "rgba(220, 38, 38, 0.15)";

  return (
    <Box
      position="relative"
      p={6}
      bg="rgba(26, 20, 16, 0.6)"
      backdropFilter="blur(20px)"
      border="1px solid"
      borderColor="rgba(247, 147, 26, 0.2)"
      borderRadius="2xl"
      boxShadow="0 8px 32px rgba(0, 0, 0, 0.4)"
      transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      _hover={{
        borderColor: "rgba(247, 147, 26, 0.4)",
        boxShadow: "0 12px 40px rgba(247, 147, 26, 0.25)",
        transform: "translateY(-4px)",
      }}
      overflow="hidden"
    >
      <Box
        position="absolute"
        top="0"
        right="0"
        width="200px"
        height="200px"
        bg="radial-gradient(circle, rgba(247, 147, 26, 0.1) 0%, transparent 70%)"
        pointerEvents="none"
      />
      
      <VStack spacing={5} align="stretch" position="relative" zIndex={1}>
        <Flex justify="space-between" align="center">
          <Flex align="center" gap={2}>
            <BitcoinSymbol size={20} />
            <Text
              fontWeight="bold"
              fontSize="sm"
              color="gray.400"
              fontFamily="mono"
            >
              {stream.id.slice(0, 8)}...{stream.id.slice(-6)}
            </Text>
          </Flex>
          <Badge
            px={3}
            py={1}
            borderRadius="full"
            bg={statusBg}
            color={`${statusColor}.400`}
            border="1px solid"
            borderColor={`${statusColor}.400`}
            textTransform="uppercase"
            fontSize="xs"
            fontWeight="700"
            letterSpacing="wide"
          >
            {stream.status}
          </Badge>
        </Flex>

        <VStack spacing={3} align="stretch">
          <Flex align="center" gap={2}>
            <Box w="6px" h="6px" borderRadius="full" bg="bitcoin.400" />
            <Text color="gray.400" fontSize="sm" fontWeight="500">
              Beneficiary
            </Text>
          </Flex>
          <Text
            color="gray.200"
            fontSize="sm"
            fontFamily="mono"
            pl={4}
            wordBreak="break-all"
          >
            {stream.beneficiary}
          </Text>
        </VStack>

        <Flex gap={4} flexWrap="wrap">
          <Flex
            flex="1"
            minW="200px"
            align="center"
            gap={3}
            p={3}
            bg="rgba(10, 10, 10, 0.4)"
            borderRadius="xl"
            border="1px solid"
            borderColor="rgba(247, 147, 26, 0.1)"
          >
            <VaultIcon size={20} />
            <VStack align="start" spacing={0}>
              <Text fontSize="xs" color="gray.500" fontWeight="500">
                Vault ID
              </Text>
              <Text fontSize="sm" color="gray.300" fontFamily="mono">
                {stream.vaultId ? `${stream.vaultId.slice(0, 8)}...` : "mock"}
              </Text>
            </VStack>
          </Flex>

          <Flex
            flex="1"
            minW="200px"
            align="center"
            gap={3}
            p={3}
            bg="rgba(10, 10, 10, 0.4)"
            borderRadius="xl"
            border="1px solid"
            borderColor="rgba(247, 147, 26, 0.1)"
          >
            <ClockIcon size={20} />
            <VStack align="start" spacing={0}>
              <Text fontSize="xs" color="gray.500" fontWeight="500">
                Rate
              </Text>
              <Text fontSize="sm" color="bitcoin.400" fontWeight="600">
                {stream.rateSatsPerSec} sats/sec
              </Text>
            </VStack>
          </Flex>
        </Flex>

        <Box
          p={4}
          bg="rgba(10, 10, 10, 0.4)"
          borderRadius="xl"
          border="1px solid"
          borderColor="rgba(247, 147, 26, 0.1)"
        >
          <Flex justify="space-between" align="center" mb={2}>
            <Text fontSize="sm" color="gray.400" fontWeight="500">
              Total Amount
            </Text>
            <Text
              fontSize="lg"
              fontWeight="700"
              bgGradient="linear(to-r, bitcoin.400, gold.400)"
              bgClip="text"
            >
              ₿ {satsToBtc(stream.totalAmountSats).toFixed(8)}
            </Text>
          </Flex>
          <VestingBar
            streamedSats={stream.streamedCommitmentSats}
            totalSats={stream.totalAmountSats}
            label="Vesting Progress"
          />
        </Box>

        <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
          <ProofStatus state={proofState} />
          {onClaim && (
            <Button
              size="md"
              onClick={() => onClaim(stream.id)}
              isDisabled={claimableSats <= 0 || stream.status !== "active"}
              isLoading={isClaiming}
              leftIcon={<BitcoinSymbol size={16} />}
            >
              Claim ₿ {satsToBtc(Math.max(claimableSats, 0)).toFixed(8)}
            </Button>
          )}
        </Flex>
      </VStack>
    </Box>
  );
}
