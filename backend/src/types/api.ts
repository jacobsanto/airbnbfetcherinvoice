export interface AccountCreateBody {
  label: string;
  email: string;
  password: string;
}

export interface AccountUpdateBody {
  label?: string;
  email?: string;
  password?: string;
}

export interface JobCreateBody {
  account_id: string;
  month: number;
  year: number;
}

export interface OtpSubmitBody {
  otp_code: string;
}

export interface PaginationQuery {
  limit?: number;
  offset?: number;
}

export interface JobListQuery extends PaginationQuery {
  status?: string;
  account_id?: string;
}

export interface InvoiceListQuery extends PaginationQuery {
  account_id?: string;
  year?: number;
  month?: number;
}
