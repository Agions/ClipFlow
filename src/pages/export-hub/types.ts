export interface MatrixPlatformItem {
  id: string;
  name: string;
  account: string;
  fans: string;
  enabled: boolean;
  status: '就绪' | '排队中' | '已发布' | '未绑定';
  badgeColor: string;
  boundUser?: string;
}
