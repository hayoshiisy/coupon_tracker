export interface Coupon {
  id?: number;
  name: string;
  discount: string;
  expiration_date: string;
  store: string;
  status: string;
  code?: string;
  standard_price?: string;
  registered_by?: string;
  payment_status?: string;
  additional_info?: string;
} 