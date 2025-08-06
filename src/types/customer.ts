import mongoose, { Document } from "mongoose";

export interface ICustomer extends Document {
  firstName?: string;
  lastName?: string;
  userName: string;
  email?: string;
  contactNo?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  companyName?: string;
  companyType?: string;
  companyEmail?: string;
  enrollEmail?: string;
  designation?: string;
  courses: Record<string, any>[];
  purchased_courses: Record<string, any>[];
  free_course_tot_qty?: number;
  free_course_assign_qty?: number;
  userType?: number;
  is_account_enabled?: boolean;
  is_blocked?: boolean;
  freeSignUp?: boolean;
  freeStudyGuide?: boolean;
}

export interface OrderItem {
  _id: mongoose.Schema.Types.ObjectId;
  course_id: {
    type: mongoose.Schema.Types.ObjectId;
  };
  portal_type: number;
  title: string;
  category: string;
  description: string;
  price: number;
  actual_price: number;
  sku: number;
  quantity: number;
  discount: number;
}

export interface OrderCreation extends ICustomer {
  total: string;
  transaction_id?: string;
  order_id?: string;
  items: OrderItem[];
  user?: {
    _id: string;
    userName?: string;
    full_name?: string;
  };
}
