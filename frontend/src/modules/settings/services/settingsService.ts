import http from '../../../shared/services/http';

export type SettingsData = {
  preferences: {
    tema: 'light' | 'dark' | 'system';
    idioma: string;
    timezone: string;
    idfilial_padrao: number | null;
    dashboard_escopo_padrao: 'empresa' | 'filial';
    sidebar_recolhida: boolean;
  };
  finance: {
    meta_mensal: number;
  };
  options: {
    branches: Array<{ id: number; nome: string }>;
  };
};

export type PreferencesPayload = SettingsData['preferences'];

export const settingsService = {
  show: async () =>
    (await http.get<{ data: SettingsData }>('/settings')).data.data,
  savePreferences: async (payload: PreferencesPayload) =>
    (await http.put('/settings/preferences', payload)).data,
  saveFinance: async (payload: { meta_mensal: number }) =>
    (await http.put('/settings/finance', payload)).data,
};
