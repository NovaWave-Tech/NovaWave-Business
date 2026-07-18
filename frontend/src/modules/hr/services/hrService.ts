import http from '../../../shared/services/http';

export type Employee = {
  idfuncionario: number;
  nome: string;
  cpf?: string | null;
  email?: string | null;
  telefone?: string | null;
  salario: number;
  data_admissao?: string | null;
  data_demissao?: string | null;
  data_nascimento?: string | null;
  situacao: number;
  idfilial: number;
  filial: string;
  idcargo?: number | null;
  cargo?: string | null;
  iddepartamento?: number | null;
  departamento?: string | null;
};

export type EmployeeDetail = Employee & {
  history: Array<{ idauditoria: number; acao: string; criado_em: string }>;
};

export type Department = {
  id: number;
  nome: string;
  descricao?: string | null;
  situacao: number;
};
export type Position = {
  id: number;
  nome: string;
  descricao?: string | null;
  salario_base: number;
  iddepartamento?: number | null;
  situacao: number;
};

export type HrData = {
  employees: Employee[];
  metrics: {
    ativos: number;
    inativos: number;
    folha: number;
    admitidos_mes: number;
  };
  options: {
    branches: Array<{ id: number; nome: string }>;
    departments: Department[];
    positions: Position[];
  };
};

export type EmployeePayload = {
  nome: string;
  idfilial: number;
  idcargo?: number | null;
  cpf?: string;
  email?: string;
  telefone?: string;
  salario: number;
  data_admissao?: string;
  data_demissao?: string;
  data_nascimento?: string;
  situacao?: boolean;
};

export type StructureEntity = 'departments' | 'positions';

export const hrService = {
  list: async (params: Record<string, string>) =>
    (await http.get<{ data: HrData }>('/employees', { params })).data.data,
  detail: async (id: number) =>
    (await http.get<{ data: EmployeeDetail }>(`/employees/${id}`)).data.data,
  create: async (payload: EmployeePayload) =>
    (await http.post('/employees', payload)).data,
  update: async (id: number, payload: EmployeePayload) =>
    (await http.put(`/employees/${id}`, payload)).data,
  status: async (id: number, situacao: number) =>
    (await http.patch(`/employees/${id}/status`, { situacao })).data,

  saveDepartment: async (
    payload: { nome: string; descricao?: string },
    id?: number
  ) =>
    id
      ? (await http.put(`/employees/departments/${id}`, payload)).data
      : (await http.post('/employees/departments', payload)).data,
  savePosition: async (
    payload: {
      nome: string;
      descricao?: string;
      salario_base: number;
      iddepartamento?: number | null;
    },
    id?: number
  ) =>
    id
      ? (await http.put(`/employees/positions/${id}`, payload)).data
      : (await http.post('/employees/positions', payload)).data,
  structureStatus: async (
    entity: StructureEntity,
    id: number,
    situacao: number
  ) =>
    (await http.patch(`/employees/${entity}/${id}/status`, { situacao })).data,
};
