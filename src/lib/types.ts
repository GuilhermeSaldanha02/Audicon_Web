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
