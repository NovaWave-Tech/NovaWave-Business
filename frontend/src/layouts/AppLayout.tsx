import {
  Box,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerOverlay,
  Flex,
  useBreakpointValue,
  useDisclosure,
} from '@chakra-ui/react';
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import AppTopbar from './AppTopbar';

export default function AppLayout() {
  const drawer = useDisclosure();
  const [userCollapsed, setUserCollapsed] = useState(
    () => localStorage.getItem('erp_sidebar_collapsed') === 'true'
  );
  const collapsed =
    useBreakpointValue({ base: true, xl: userCollapsed }) ?? true;
  const sidebarWidth = collapsed ? '72px' : '260px';
  const toggle = () =>
    setUserCollapsed(value => {
      localStorage.setItem('erp_sidebar_collapsed', String(!value));
      return !value;
    });

  return (
    <Flex minH="100vh" w="full" maxW="100vw" overflowX="hidden" bg="erp.canvas">
      <Box
        as="aside"
        display={{ base: 'none', lg: 'block' }}
        position="fixed"
        insetY={0}
        left={0}
        w={sidebarWidth}
        transition="width 200ms ease"
        zIndex={30}
      >
        <AppSidebar collapsed={collapsed} onToggle={toggle} />
      </Box>
      <Drawer isOpen={drawer.isOpen} placement="left" onClose={drawer.onClose}>
        <DrawerOverlay />
        <DrawerContent maxW="290px">
          <DrawerBody p={0}>
            <AppSidebar mobile onClose={drawer.onClose} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
      <Box
        flex="1"
        w={{ base: '100%', lg: 'auto' }}
        maxW={{ base: '100vw', lg: 'none' }}
        minW={0}
        ml={{ base: 0, lg: sidebarWidth }}
        transition="margin-left 200ms ease"
      >
        <AppTopbar onMenuOpen={drawer.onOpen} />
        <Box
          as="main"
          w="full"
          minW={0}
          px={{ base: 4, md: 6 }}
          py={6}
          maxW="1600px"
          mx="auto"
        >
          <Outlet />
        </Box>
      </Box>
    </Flex>
  );
}
