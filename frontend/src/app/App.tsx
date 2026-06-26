import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import LoginPage from '../modules/auth/pages/LoginPage';
import DashboardPage from '../modules/dashboard/pages/DashboardPage';
import { AuthProvider } from '../shared/auth/AuthContext';
import ModulePlaceholderPage from '../shared/pages/ModulePlaceholderPage';
import { getToken, isTokenValid } from '../shared/services/http';

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
    'users',
    'Usuarios',
    'Controle de usuarios vinculados a empresas, filiais e cargos.',
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
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoutes />}>
          <Route path="/dashboard" element={<DashboardPage />} />
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
    </Router>
  );
}
