export type NotificationType =
  | 'receber_vencido'
  | 'receber_vencendo'
  | 'pagar_vencido'
  | 'pagar_vencendo'
  | 'estoque_baixo';

export type AppNotification = {
  idnotificacao: number;
  titulo: string;
  mensagem: string;
  tipo: NotificationType | string | null;
  link: string | null;
  lida: boolean;
  criado_em: string;
};

export type NotificationsData = {
  notifications: AppNotification[];
  unread: number;
};
