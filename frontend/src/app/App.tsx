import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from 'react-router-dom';
import { Flex, Spinner } from '@chakra-ui/react';
import { lazy, Suspense } from 'react';
import AppLayout from '../layouts/AppLayout';
import LoginPage from '../modules/auth/pages/LoginPage';
import DashboardPage from '../modules/dashboard/pages/DashboardPage';
import { AuthProvider } from '../shared/auth/AuthContext';
import ModulePlaceholderPage from '../shared/pages/ModulePlaceholderPage';
import { getToken, isTokenValid } from '../shared/services/http';
import { PlatformAuthProvider } from '../modules/platform/auth/PlatformAuthContext';
import { platformSession } from '../modules/platform/services/platformApi';

const PlatformLoginPage = lazy(
  () => import('../modules/platform/auth/PlatformLoginPage')
);
const PlatformLayout = lazy(
  () => import('../modules/platform/layout/PlatformLayout')
);
const PlatformDashboardPage = lazy(
  () => import('../modules/platform/dashboard/PlatformDashboardPage')
);
const CompaniesPage = lazy(
  () => import('../modules/platform/empresas/CompaniesPage')
);
const NewCompanyPage = lazy(
  () => import('../modules/platform/empresas/NewCompanyPage')
);
const CompanyDetailPage = lazy(
  () => import('../modules/platform/empresas/CompanyDetailPage')
);
const PlansPage = lazy(() => import('../modules/platform/planos/PlansPage'));
const SubscriptionsPage = lazy(
  () => import('../modules/platform/assinaturas/SubscriptionsPage')
);
const PlatformUsersPage = lazy(
  () => import('../modules/platform/usuarios/PlatformUsersPage')
);
const AuditPage = lazy(() => import('../modules/platform/auditoria/AuditPage'));
const SettingsPage = lazy(
  () => import('../modules/platform/configuracoes/SettingsPage')
);
const BranchesPage = lazy(
  () => import('../modules/branches/pages/BranchesPage')
);
const UsersPage = lazy(() => import('../modules/users/pages/UsersPage'));
const CustomersPage = lazy(
  () => import('../modules/customers/pages/CustomersPage')
);
const ProductsPage = lazy(
  () => import('../modules/products/pages/ProductsPage')
);
const FinancePage = lazy(() => import('../modules/finance/pages/FinancePage'));
const ReportsPage = lazy(() => import('../modules/reports/pages/ReportsPage'));
const SalesPage = lazy(() => import('../modules/sales/pages/SalesPage'));
const InventoryPage = lazy(
  () => import('../modules/inventory/pages/InventoryPage')
);
const PermissionsPage = lazy(
  () => import('../modules/permissions/pages/PermissionsPage')
);

function LoadingPage() {
  return (
    <Flex minH="100vh" align="center" justify="center">
      <Spinner color="brand.500" />
    </Flex>
  );
}

function ProtectedRoutes() {
  const isAuthenticated = Boolean(getToken() && isTokenValid());

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AuthProvider>
      <AppLayout />
    </AuthProvider>
  );
}

function ProtectedPlatformRoutes() {
  if (!platformSession.token() || !platformSession.valid()) {
    return <Navigate to="/platform/login" replace />;
  }

  return (
    <PlatformAuthProvider>
      <PlatformLayout />
    </PlatformAuthProvider>
  );
}

const placeholders = [
  [
    'companies',
    'Empresas',
    'Cadastro e administracao de empresas do ambiente SaaS.',
  ],
  [
    'suppliers',
    'Fornecedores',
    'Cadastro de fornecedores e relacionamento com compras.',
  ],
  [
    'purchases',
    'Compras',
    'Solicitacoes, pedidos de compra e entrada de mercadorias.',
  ],
  [
    'cashier',
    'Caixa',
    'Abertura, fechamento e movimentacoes de caixa por filial.',
  ],
  [
    'settings',
    'Configuracoes',
    'Preferencias gerais, integracoes e parametros do ERP.',
  ],
] as const;

export default function App() {
  return (
    <Router>
      <Suspense fallback={<LoadingPage />}>
        <Routes>
          <Route
            path="/platform"
            element={<Navigate to="/platform/dashboard" replace />}
          />
          <Route path="/platform/login" element={<PlatformLoginPage />} />
          <Route element={<ProtectedPlatformRoutes />}>
            <Route
              path="/platform/dashboard"
              element={<PlatformDashboardPage />}
            />
            <Route path="/platform/empresas" element={<CompaniesPage />} />
            <Route
              path="/platform/empresas/nova"
              element={<NewCompanyPage />}
            />
            <Route
              path="/platform/empresas/:id"
              element={<CompanyDetailPage />}
            />
            <Route path="/platform/planos" element={<PlansPage />} />
            <Route
              path="/platform/assinaturas"
              element={<SubscriptionsPage />}
            />
            <Route path="/platform/usuarios" element={<PlatformUsersPage />} />
            <Route path="/platform/auditoria" element={<AuditPage />} />
            <Route path="/platform/configuracoes" element={<SettingsPage />} />
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoutes />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/branches" element={<BranchesPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/finance" element={<FinancePage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/permissions" element={<PermissionsPage />} />
            {placeholders.map(([path, title, description]) => (
              <Route
                key={path}
                path={`/${path}`}
                element={
                  <ModulePlaceholderPage
                    title={title}
                    description={description}
                  />
                }
              />
            ))}
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}
