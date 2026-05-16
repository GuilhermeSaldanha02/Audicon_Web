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
};

export type Condominium = {
  id: number;
  name: string;
  cnpj: string;
  address: string;
};

export type Unit = {
  id: number;
  identifier: string;
  ownerName: string;
  residentEmail?: string | null;
  residentPhone?: string | null;
};

export type InfractionStatus = 'pending' | 'analyzed' | 'sent';

export type Infraction = {
  id: number;
  description: string;
  formalDescription?: string;
  suggestedPenalty?: string;
  status: InfractionStatus;
  occurrenceDate: string;
  unit?: Unit;
};
