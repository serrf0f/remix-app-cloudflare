import { Button, Flex, Text } from "@radix-ui/themes";

export default function Dashboard() {
  return (
    <Flex direction="column" gap="2">
      <Text>Hello from Radix Themes :)</Text>
      <Button variant="classic">Let's go</Button>
    </Flex>
  );
}
