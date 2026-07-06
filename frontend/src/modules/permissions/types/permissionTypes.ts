export type CatalogAction = {
  modulo: string;
  acao: string;
  label: string;
  idpermissao: number | null;
  descricao: string;
};
export type CatalogModule = {
  modulo: string;
  label: string;
  actions: CatalogAction[];
};
export type Catalog = {
  modules: CatalogModule[];
  actions: Record<string, string>;
};

export type BranchOption = { id: number; nome: string };

export type ProfileRow = {
  idperfil: number;
  nome: string;
  descricao?: string;
  escopo: number;
  situacao: number;
  criado_em: string;
  atualizado_em: string;
  criado_por: string;
  usuarios: number;
  permissoes: number;
  filiais: number;
  ultima_alteracao?: string;
};

export type ProfileMetrics = {
  profiles: number;
  linked_users: number;
  permissions: number;
  branches: number;
  top_profile: string;
  custom_profiles: number;
};

export type ProfileListData = {
  profiles: ProfileRow[];
  metrics: ProfileMetrics;
  catalog: Catalog;
  options: { branches: BranchOption[] };
};

export type ProfilePermission = {
  modulo: string;
  acao: string;
  idpermissao: number;
  descricao: string;
};

export type ProfileUser = {
  idusuario: number;
  nome: string;
  email: string;
  situacao: number;
  ultimo_login?: string;
  cargo: string;
  filial: string;
};

export type ProfileHistory = {
  idauditoria: number;
  acao: string;
  valores_anteriores?: unknown;
  valores_novos?: unknown;
  ip?: string;
  criado_em: string;
  usuario: string;
};

export type ProfileDetail = ProfileRow & {
  permissions: ProfilePermission[];
  users: ProfileUser[];
  history: ProfileHistory[];
};

export type ProfilePayload = {
  nome: string;
  descricao?: string;
  permissions: Array<{ modulo: string; acao: string }>;
};
