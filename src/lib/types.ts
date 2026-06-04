export type LoginRequest = {
  email: string;
  password: string;
};

/**
 * R-08: o login não retorna mais token no corpo (o JWT vai em cookie httpOnly).
 * O corpo é apenas um marcador de sucesso; os claims vêm de GET /auth/profile.
 */
export type LoginResponse = {
  success: true;
};

/**
 * Claims do usuário autenticado, vindos de GET /auth/profile (fonte única —
 * cookie httpOnly não é legível por JS). Espelha o ProfileResponseDto do back.
 */
export type AuthClaims = {
  nome: string;
  email: string;
  isMaster: boolean;
  /** Papel do usuário: MASTER (sem tenant), GERENTE ou FUNCIONARIO (de empresa). */
  role: 'MASTER' | 'GERENTE' | 'FUNCIONARIO';
  companyId: number | null;
  mustChangePassword: boolean;
  companyName: string | null;
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
  | 'COMPANY_DELETED'
  | 'EMPLOYEE_CREATED'
  | 'EMPLOYEE_PASSWORD_RESET';

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

export type InfractionSeverity = 'LEVE' | 'MEDIA' | 'GRAVE';

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
  severity?: InfractionSeverity | null;
  occurrenceDate: string;
  approvedAt?: string | null;
  sentAt?: string | null;
  whatsappSentAt?: string | null;
  unit?: Unit;
};
