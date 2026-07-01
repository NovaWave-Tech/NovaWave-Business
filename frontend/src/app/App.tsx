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
const UsersPage = lazy(() => import('../modules/users/pages/UsersPage'));

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
    'branches',
    'Filiais',
    'Gestao de filiais, estoques, caixas e operacao por unidade.',
  ],
  [
    'permissions',
    'Permissoes',
    'RBAC com perfis, permissoes e acoes sensiveis auditaveis.',
  ],
  [
    'customers',
    'Clientes',
    'Base comercial de clientes com isolamento por empresa.',
  ],
  [
    'suppliers',
    'Fornecedores',
    'Cadastro de fornecedores e relacionamento com compras.',
  ],
  [
    'products',
    'Produtos',
    'Catalogo, categorias, marcas e dados comerciais dos produtos.',
  ],
  [
    'inventory',
    'Estoque',
    'Saldos, movimentacoes, inventario e alertas de estoque critico.',
  ],
  ['sales', 'Vendas', 'Pedidos, faturamento, PDV e historico comercial.'],
  [
    'purchases',
    'Compras',
    'Solicitacoes, pedidos de compra e entrada de mercadorias.',
  ],
  [
    'finance',
    'Financeiro',
    'Contas a pagar, contas a receber, fluxo de caixa e bancos.',
  ],
  [
    'reports',
    'Relatorios',
    'Relatorios gerenciais por empresa, filial e periodo.',
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
            <Route path="/users" element={<UsersPage />} />
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
