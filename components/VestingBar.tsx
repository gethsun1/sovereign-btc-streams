import { Box, Flex, Progress, Text } from "@chakra-ui/react";
import { satsToBtc } from "@/lib/utils";

type VestingBarProps = {
  streamedSats: number;
  totalSats: number;
  label?: string;
};

export default function VestingBar({ streamedSats, totalSats, label }: VestingBarProps) {
  const percentage = totalSats > 0 ? Math.min((streamedSats / totalSats) * 100, 100) : 0;
  return (
    <Box>
      {label && (
        <Text fontSize="sm" color="gray.300" mb={1}>
          {label}
        </Text>
      )}
      <Progress
        value={percentage}
        size="md"
        rounded="full"
        colorScheme="blue"
        bg="gray.700"
      />
      <Flex justify="space-between" mt={1} fontSize="sm" color="gray.300">
        <Text>{satsToBtc(streamedSats).toFixed(8)} BTC streamed</Text>
        <Text>{satsToBtc(totalSats).toFixed(8)} BTC total</Text>
      </Flex>
    </Box>
  );
}
