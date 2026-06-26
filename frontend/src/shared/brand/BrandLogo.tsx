import { Box, Flex, Image, Text, type BoxProps } from '@chakra-ui/react';
import { brand } from './brand';

type BrandLogoProps = BoxProps & {
  compact?: boolean;
  tone?: 'light' | 'dark';
};

export default function BrandLogo({
  compact = false,
  tone = 'light',
  ...props
}: BrandLogoProps) {
  const textColor = tone === 'light' ? brand.colors.textPrimary : '#07111F';
  const subTextColor =
    tone === 'light' ? brand.colors.textSecondary : '#475569';

  return (
    <Flex align="center" gap={3} {...props}>
      <Box
        w="40px"
        h="40px"
        borderRadius="md"
        overflow="hidden"
        bg={brand.colors.surface}
        boxShadow={brand.shadows.glow}
        flexShrink={0}
      >
        <Image
          src={brand.assets.logo}
          alt="NovaWave Business"
          w="full"
          h="full"
          objectFit="cover"
          objectPosition="center"
        />
      </Box>

      {!compact && (
        <Box minW={0}>
          <Text color={textColor} fontWeight="800" lineHeight="1.05">
            NovaWave
          </Text>
          <Text color={subTextColor} fontSize="xs" fontWeight="700">
            Business ERP
          </Text>
        </Box>
      )}
    </Flex>
  );
}
