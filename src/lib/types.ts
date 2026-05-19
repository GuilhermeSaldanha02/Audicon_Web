export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
};

export type User = {
  id: number;
  nome: string;
  email: string;
  isMaster?: boolean;
  companyId?: number | null;
};

export type Company = {
  id: number;
  name: string;
  cnpj: string;
  createdAt: string;
};

export type CreatedCompanyResult = {
  company: Company;
  admin: {
    id: number;
    email: string;
    nome: string;
    tempPassword: string;
  };
};

export type CreateCompanyRequest = {
  name: string;
  cnpj: string;
  admin: {
    nome: string;
    email: string;
  };
};

export type Employee = {
  id: number;
  nome: string;
  email: string;
};

export type CreatedEmployeeResult = {
  id: number;
  nome: string;
  email: string;
  tempPassword: string;
};

export type CreateEmployeeRequest = {
  nome: string;
  email: string;
};

export type AuditAction =
  | 'INFRACTION_CREATED'
  | 'INFRACTION_APPROVED'
  | 'INFRACTION_SENT'
  | 'INFRACTION_WHATSAPP_SENT'
  | 'INFRACTION_DELETED'
  | 'CONDOMINIUM_CREATED'
  | 'CONDOMINIUM_DELETED'
  | 'COMPANY_CREATED'
  | 'EMPLOYEE_CREATED';

export type AuditLogEntry = {
  id: number;
  createdAt: string;
  userId: number | null;
  userEmail: string | null;
  userIsMaster: boolean;
  companyId: number | null;
  action: AuditAction;
  entity: string;
  entityId: number | null;
  context: Record<string, unknown> | null;
};

export type Condominium = {
  id: number;
  name: string;
  cnpj: string;
  address: string;
  regimentoFilename?: string | null;
  regimentoUploadedAt?: string | null;
};

export type Unit = {
  id: number;
  identifier: string;
  ownerName: string;
  residentEmail?: string | null;
  residentPhone?: string | null;
};

export type InfractionStatus = 'pending' | 'analyzed' | 'approved' | 'sent';

export type NotificationChannel = 'email' | 'whatsapp';
export type NotificationStatus =
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'clicked'
  | 'bounced'
  | 'failed';

export type Notification = {
  id: number;
  channel: NotificationChannel;
  recipient: string;
  providerId?: string | null;
  status: NotificationStatus;
  failureReason?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DashboardResult = {
  totalInfractions: number;
  byStatus: Record<InfractionStatus, number>;
  byMonth: { month: string; count: number }[];
  topUnits: { unitId: number; identifier: string; condominiumName: string; count: number }[];
  approvalRate: number;
};

export type Infraction = {
  id: number;
  description: string;
  formalDescription?: string;
  suggestedPenalty?: string;
  status: InfractionStatus;
  occurrenceDate: string;
  approvedAt?: string | null;
  sentAt?: string | null;
  whatsappSentAt?: string | null;
  unit?: Unit;
};
