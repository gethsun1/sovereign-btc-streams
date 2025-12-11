import { Badge, HStack, Spinner, Text } from "@chakra-ui/react";

export type ProofState = "idle" | "generating" | "verifying" | "success" | "error";

const labelMap: Record<ProofState, string> = {
  idle: "Idle",
  generating: "Generating proof",
  verifying: "Verifying",
  success: "Verified",
  error: "Failed",
};

const colorMap: Record<ProofState, string> = {
  idle: "gray",
  generating: "purple",
  verifying: "blue",
  success: "green",
  error: "red",
};

type ProofStatusProps = {
  state: ProofState;
};

export default function ProofStatus({ state }: ProofStatusProps) {
  return (
    <HStack spacing={2}>
      {(state === "generating" || state === "verifying") && <Spinner size="xs" color={`${colorMap[state]}.300`} />}
      <Badge colorScheme={colorMap[state]}>{labelMap[state]}</Badge>
      <Text fontSize="sm" color="gray.300">
        zkBTC proof
      </Text>
    </HStack>
  );
}
