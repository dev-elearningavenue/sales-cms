// Type definitions for Invoice component

export interface ProductOption {
  product_id: string;
  product_name: string;
}

export interface PriceOption {
  price_id: string;
  unit_amount: string;
  unit_price: number;
  display_name: string;
}

export interface CouponOption {
  id: string;
  name: string;
  percent_off: number | null;
  amount_off: number | null;
}

export interface InvoiceProduct {
  product_id: string;
  name: string;
  price_id: string;
  price: string;
  quantity: number;
  total: number;
}

export interface InvoiceData {
  customerId: string;
  products: InvoiceProduct[];
  dueDate: string;
  coupon: string;
  agentName: string;
  totalPrice: number;
}

export interface FormData {
  siteName: string;
  email: string;
  fullName: string;
  contactNo: string;
  sendInvoice: boolean;
  firstName: string;
  lastName: string;
  password: string;
  userType: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  company: string;
}

export interface SiteOption {
  name: string;
  code: string;
}

// New interfaces for API integration
export interface CreateInvoiceApiRequest {
  customerId: string;
  customerEmail: string;
  contactNo?: string;
  firstName?: string;
  lastName?: string;
  siteName: string;
  products: InvoiceProduct[];
  dueDate: string;
  coupon?: string;
  agentName: string;
  agentId: string;
  subtotal: number;
  percent_off: string;
  discount?: number;
  totalPrice: number;
  hostedUrl: string;
}

export interface CreateInvoiceApiResponse {
  success: boolean;
  message: string;
  invoiceId?: string;
  invoiceNumber?: string;
  error?: string;
  // New fields for external API integration
  externalApiSuccess?: boolean;
  externalData?: any;
  externalError?: string;
  warning?: string;
  hostedUrl?: string;
  percent_off?: string;
}

// Customer creation API interfaces
export interface CreateCustomerApiRequest {
  site_name: string;
  email: string;
  contactNo?: string;
  send_invoice?: number;
  firstName?: string;
  lastName?: string;
  password?: string;
  userType?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  company?: string;
  fullName?: string; // For existing customers
}

export interface CreateCustomerApiResponse {
  success: boolean;
  customerId?: string;
  message: string;
  customer?: {
    email: string;
    fullName: string;
    contactNo: string;
    site: string;
  };
  externalApiSuccess?: boolean;
  externalCustomerId?: string;
  externalError?: string;
} 