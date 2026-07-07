import {
  Boxes,
  Building2,
  CircleDollarSign,
  CreditCard,
  FileBarChart,
  GitBranch,
  LayoutDashboard,
  Package,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Truck,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type ErpNavItem = { label: string; path: string; icon: LucideIcon };
export type ErpNavGroup = { label: string; items: ErpNavItem[] };

export const erpNavigation: ErpNavGroup[] = [
  {
    label: 'Visao geral',
    items: [{ label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Operacao',
    items: [
      { label: 'Clientes', path: '/customers', icon: Users },
      { label: 'Produtos', path: '/products', icon: Package },
      { label: 'Vendas', path: '/sales', icon: ShoppingCart },
      { label: 'Compras', path: '/purchases', icon: ShoppingBag },
      { label: 'Estoque', path: '/inventory', icon: Boxes },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { label: 'Financeiro', path: '/finance', icon: CircleDollarSign },
      { label: 'Caixa', path: '/cashier', icon: CreditCard },
      { label: 'Relatorios', path: '/reports', icon: FileBarChart },
    ],
  },
  {
    label: 'Gestao',
    items: [
      { label: 'Empresa', path: '/companies', icon: Building2 },
      { label: 'Filiais', path: '/branches', icon: GitBranch },
      { label: 'Usuarios', path: '/users', icon: Users },
      { label: 'Permissoes', path: '/permissions', icon: ShieldCheck },
      { label: 'Fornecedores', path: '/suppliers', icon: Truck },
      { label: 'Configuracoes', path: '/settings', icon: Settings },
    ],
  },
];

export const erpNavItems = erpNavigation.flatMap(group => group.items);
