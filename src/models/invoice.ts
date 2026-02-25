import mongoose, { Schema, Document, Model } from "mongoose";

export interface IInvoiceProduct {
  product_id: string;
  name: string;
  price_id: string;
  price: string;
  quantity: number;
  total: number;
}

export interface IInvoice extends Document {
  _id: string;
  customerId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  siteName: string;
  products: IInvoiceProduct[];
  dueDate: string;
  coupon: string;
  agentName: string;
  agentId: mongoose.Types.ObjectId;
  subtotal: number;
  discount: number;
  totalPrice: number;
  status: string;
  invoiceNumber: string;
  percent_off?: string;
  hostedUrl?: string;
  paidAt?: Date | null;
  orderId?: string;
  user?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

const InvoiceProductSchema = new Schema({
  product_id: { type: String, required: true },
  name: { type: String, required: true },
  price_id: { type: String, required: true },
  price: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  total: { type: Number, required: true, min: 0 }
}, { _id: false });

const InvoiceSchema = new Schema({
  customerId: { type: String, required: true },
  email: { type: String, required: true },
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  siteName: { type: String, required: true },
  products: [InvoiceProductSchema],
  dueDate: { type: String, required: true },
  coupon: { type: String, default: '' },
  agentName: { type: String, required: true },
  agentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  subtotal: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 },
  status: { 
    type: String, 
    enum: ['unpaid', 'sent', 'paid', 'overdue', 'cancelled'],
    default: 'unpaid'
  },
  invoiceNumber: { type: String, unique: true },
  percent_off: { type: String, default: '' },
  hostedUrl: { type: String, default: '' },
  paidAt: { type: Date, default: null },
  orderId: { type: String, default: null },
  user: { type: mongoose.Schema.Types.ObjectId, default: null },
  deletedAt: { type: Date, default: null },
}, {
  timestamps: true,
  strict: true
});

// Generate invoice number
InvoiceSchema.pre('save', function(next) {
  if (!this.invoiceNumber) {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.invoiceNumber = `INV-${timestamp}-${random}`;
  }
  next();
});

const Invoice: Model<IInvoice> = mongoose.models.Invoice || mongoose.model<IInvoice>("Invoice", InvoiceSchema);

export default Invoice; 