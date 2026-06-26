import { Box, Flex } from '@chakra-ui/react';
import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import AppTopbar from './AppTopbar';

export default function AppLayout() {
  return (
    <Flex minH="100vh" bg="#07111f">
      <AppSidebar />

      <Box flex="1" ml={{ base: '72px', xl: '260px' }} minW={0}>
        <AppTopbar />
        <Box as="main" px={{ base: 4, lg: 6 }} py={5}>
          <Outlet />
        </Box>
      </Box>
    </Flex>
  );
}
