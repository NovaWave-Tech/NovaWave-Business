import {
  Boxes,
  Building2,
  CircleDollarSign,
  CreditCard,
  FileBarChart,
  GitBranch,
  HandCoins,
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

export type ErpNavItem = {
  label: string;
  path: string;
  icon: LucideIcon;
  /** Permissao "modulo:acao" exigida para ver o item (sem = sempre visivel). */
  permission?: string;
};
export type ErpNavGroup = { label: string; items: ErpNavItem[] };

export const erpNavigation: ErpNavGroup[] = [
  {
    label: 'Visao geral',
    items: [
      {
        label: 'Dashboard',
        path: '/dashboard',
        icon: LayoutDashboard,
        permission: 'dashboard:visualizar',
      },
    ],
  },
  {
    label: 'Operacao',
    items: [
      {
        label: 'Clientes',
        path: '/customers',
        icon: Users,
        permission: 'cliente:visualizar',
      },
      {
        label: 'Produtos',
        path: '/products',
        icon: Package,
        permission: 'produto:visualizar',
      },
      {
        label: 'Vendas',
        path: '/sales',
        icon: ShoppingCart,
        permission: 'venda:visualizar',
      },
      {
        label: 'Compras',
        path: '/purchases',
        icon: ShoppingBag,
        permission: 'compra:visualizar',
      },
      {
        label: 'Estoque',
        path: '/inventory',
        icon: Boxes,
        permission: 'estoque:visualizar',
      },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      {
        label: 'Financeiro',
        path: '/finance',
        icon: CircleDollarSign,
        permission: 'financeiro:visualizar',
      },
      {
        label: 'Caixa',
        path: '/cashier',
        icon: CreditCard,
        permission: 'financeiro:visualizar',
      },
      {
        label: 'Recebimentos',
        path: '/receivables',
        icon: HandCoins,
        permission: 'financeiro:visualizar',
      },
      {
        label: 'Relatorios',
        path: '/reports',
        icon: FileBarChart,
        permission: 'relatorio:visualizar',
      },
    ],
  },
  {
    label: 'Gestao',
    items: [
      {
        label: 'Empresa',
        path: '/companies',
        icon: Building2,
        permission: 'configuracao:visualizar',
      },
      {
        label: 'Filiais',
        path: '/branches',
        icon: GitBranch,
        permission: 'filial:visualizar',
      },
      {
        label: 'Usuarios',
        path: '/users',
        icon: Users,
        permission: 'usuario:visualizar',
      },
      {
        label: 'Permissoes',
        path: '/permissions',
        icon: ShieldCheck,
        permission: 'usuario:administrar',
      },
      {
        label: 'Fornecedores',
        path: '/suppliers',
        icon: Truck,
        permission: 'fornecedor:visualizar',
      },
      { label: 'Configuracoes', path: '/settings', icon: Settings },
    ],
  },
];

export const erpNavItems = erpNavigation.flatMap(group => group.items);
