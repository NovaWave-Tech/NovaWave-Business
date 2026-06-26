import { Box, Heading, Text } from '@chakra-ui/react';
import { brand } from '../brand/brand';

type ModulePlaceholderPageProps = {
  title: string;
  description: string;
};

export default function ModulePlaceholderPage({
  title,
  description,
}: ModulePlaceholderPageProps) {
  return (
    <Box
      bg={brand.colors.surface}
      border="1px solid"
      borderColor={brand.colors.border}
      borderRadius="md"
      p={6}
      boxShadow={brand.shadows.level1}
    >
      <Text
        color={brand.colors.secondary}
        fontSize="xs"
        fontWeight="800"
        textTransform="uppercase"
      >
        Modulo preparado
      </Text>
      <Heading mt={2} size="md" color={brand.colors.textPrimary}>
        {title}
      </Heading>
      <Text color={brand.colors.textSecondary} mt={2} maxW="760px">
        {description}
      </Text>
    </Box>
  );
}
