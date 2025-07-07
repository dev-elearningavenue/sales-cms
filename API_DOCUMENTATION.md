# Sales CMS API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Routes](#api-routes)
4. [Data Models](#data-models)
5. [TypeScript Interfaces](#typescript-interfaces)
6. [Controllers](#controllers)
7. [Issues & Recommendations](#issues--recommendations)

---

## Overview

The Sales CMS is a Next.js-based lead management system with the following architecture:
- **Frontend**: React with TypeScript
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with HTTP-only cookies
- **Real-time**: Socket.io for notifications

### User Types
- **Type 1**: Super Admin (highest privileges)
- **Type 2**: Admin (can manage Type 3 users)
- **Type 3**: Salesperson (limited privileges)

---

## Authentication

### JWT Token Structure
```typescript
interface TokenPayload {
  _id: string;
  email: string;
  full_name: string;
  user_name: string;
  user_type: number;
}
```

### Authentication Flow
1. Login via `/api/auth/login`
2. JWT stored in HTTP-only cookie
3. Token verified on protected routes
4. Logout via `/api/auth/logout` clears cookie

---

## API Routes

### Authentication Routes

#### POST `/api/auth/login`
**Purpose**: User authentication
**Request Body**:
```typescript
{
  email: string;
  password: string;
}
```
**Response**:
```typescript
{
  success: boolean;
  message: string;
  user: {
    _id: string;
    email: string;
    full_name: string;
    user_name: string;
    user_type: number;
  };
}
```
**Issues**: 
- ❌ Plain text password comparison
- ❌ No password hashing
- ❌ No rate limiting

#### POST `/api/auth/logout`
**Purpose**: User logout
**Response**:
```typescript
{
  success: boolean;
  message: string;
}
```

#### GET `/api/auth/session`
**Purpose**: Get current user session
**Response**: TokenPayload or 401

#### GET `/api/auth/me`
**Purpose**: Get current user info
**Response**:
```typescript
{
  email: string;
}
```
**Issues**: 
- ❌ Inconsistent with session endpoint
- ❌ Limited user information

### Lead Management Routes

#### GET `/api/leads`
**Purpose**: Get all leads (paginated)
**Query Parameters**:
- `limit`: number (default: 250)
- `skip`: number
- `latest`: boolean

**Response**:
```typescript
{
  message: string;
  leads: ILead[];
}
```
**Issues**:
- ❌ No proper pagination metadata
- ❌ Hard-coded limit of 250
- ❌ No filtering options

#### POST `/api/leads`
**Purpose**: Create new lead
**Request Body**: Partial<ILead>
**Response**:
```typescript
{
  success: boolean;
  message: string;
  lead?: ILead;
}
```

#### DELETE `/api/leads`
**Purpose**: Delete leads (single or batch)
**Request Body**:
```typescript
{
  leadId?: string;
  leadIds?: string[];
}
```
**Permission**: User types 1 & 2 only

#### GET `/api/leads/[leadId]`
**Purpose**: Get specific lead by ID
**Response**:
```typescript
{
  success: boolean;
  lead: ILead;
}
```

#### POST `/api/leads/assign`
**Purpose**: Assign lead to user
**Request Body**:
```typescript
{
  leadId: string;
  userId?: string; // If not provided, assigns to current user
}
```
**Permission Logic**:
- Type 1: Can assign to types 2 & 3
- Type 2: Can assign to type 3 only
- Type 3: Can only assign to self

#### GET `/api/leads/count`
**Purpose**: Get total lead count
**Response**:
```typescript
{
  count: number;
}
```

#### GET `/api/leads/updates`
**Purpose**: Get recent lead updates
**Response**: Array of recent leads

#### POST `/api/leads/custom`
**Purpose**: Create custom lead
**Request Body**:
```typescript
{
  firstName: string;
  lastName: string;
  email: string;
  contactNo: string;
  domain: "OOR" | "OOC" | "OES";
  supportType: "call" | "chat" | "email";
  coursesInterested: CourseInterest[];
}
```

### My Leads Routes

#### GET `/api/my-leads`
**Purpose**: Get leads assigned to current user
**Response**:
```typescript
{
  message: string;
  leads: ILead[];
}
```

#### PUT `/api/my-leads`
**Purpose**: Update lead status
**Request Body**:
```typescript
{
  leadId: string;
  status: string;
  resolve_status?: string;
  conversion_value?: number;
  next_follow_up?: NextFollowUp[];
}
```

#### GET `/api/my-leads/count`
**Purpose**: Get count of user's leads
**Response**:
```typescript
{
  count: number;
}
```

#### GET `/api/my-leads/updates`
**Purpose**: Get recent updates to user's leads

### User Management Routes

#### GET `/api/users`
**Purpose**: Get users based on permissions
**Permission Logic**:
- Type 1: Can see types 2 & 3
- Type 2: Can see type 3 only
- Type 3: Cannot see any users

**Response**:
```typescript
{
  success: boolean;
  message: string;
  users: Array<{
    _id: string;
    full_name: string;
    user_type: number;
  }>;
}
```

### Dashboard Routes

#### GET `/api/dashboard`
**Purpose**: Get dashboard metrics
**Query Parameters**:
- `startDate`: string (ISO date)
- `endDate`: string (ISO date)

**Response**:
```typescript
{
  success: boolean;
  data: {
    salesPeople: SalesPerson[];
    totals: DashboardTotals;
    lastUpdated: string;
    dateRange: { startDate: Date; endDate: Date };
  };
}
```

#### GET `/api/member-stats/[id]`
**Purpose**: Get specific member statistics
**Special Cases**:
- `id = 'admin-combined'`: Aggregated admin stats
- Regular user ID: Individual stats

### Customer Management Routes

#### POST `/api/customers`
**Purpose**: Create customer
**Request Body**: CreateCustomerRequest
**Response**: CreateCustomerResponse

#### GET `/api/customers`
**Purpose**: Check if customer exists
**Query Parameters**:
- `email`: string (required)
- `siteName`: string

### Order Management Routes

#### POST `/api/orders`
**Purpose**: Create new order
**Request Body**: Order data with domain
**Response**:
```typescript
{
  success: boolean;
  message: string;
  order?: any;
}
```

#### GET `/api/orders`
**Purpose**: Get all orders
**Query Parameters**:
- `limit`: number
- `skip`: number
- `domain`: string

### Invoice Management Routes

#### POST `/api/invoice`
**Purpose**: Create invoice
**Request Body**: CreateInvoiceRequest
**Response**: CreateInvoiceResponse

#### GET `/api/invoice`
**Purpose**: Get invoice info (basic endpoint)

### Notification Routes

#### GET `/api/notifications`
**Purpose**: Get user notifications
**Query Parameters**:
- `unreadOnly`: boolean
- `limit`: number (default: 50)
- `after`: string (ISO date for pagination)

**Response**:
```typescript
{
  success: boolean;
  notifications: INotification[];
  unreadCount: number;
}
```

#### PATCH `/api/notifications`
**Purpose**: Mark notifications as read
**Request Body**:
```typescript
{
  notificationIds?: string[];
  markAll?: boolean;
}
```

#### DELETE `/api/notifications`
**Purpose**: Delete notifications
**Request Body**:
```typescript
{
  notificationIds?: string[];
  deleteAll?: boolean;
}
```

#### GET `/api/notifications/updates`
**Purpose**: Get recent notification updates

---

## Data Models

### Lead Model
```typescript
interface ILead {
  _id?: string;
  category: LeadCategory;
  contact_us?: ObjectId;
  scholarship?: ObjectId;
  free_signup?: ObjectId;
  abandoned_cart?: ObjectId;
  order_creation?: ObjectId;
  custom_lead?: ObjectId;
  status?: string;
  resolve_status?: string;
  assigned: boolean;
  assigned_to?: ObjectId;
  assignedAt?: Date;
  resolved?: boolean;
  resolvedAt?: Date;
  created_by?: ObjectId;
  domain: "OOR" | "OOC" | "OES" | "FOC" | "OSHAPRO";
  next_follow_up?: NextFollowUp[];
  conversion_value?: number;
  notes?: Note[];
  createdAt?: Date;
}
```

### User Model
```typescript
interface IUser {
  _id: string;
  full_name: string;
  user_name?: string;
  email: string;
  password: string;
  user_type: number;
  is_blocked?: boolean;
}
```

### Notification Model
```typescript
interface INotification {
  _id: string;
  type: NotificationType;
  message: string;
  lead?: ObjectId;
  from_user?: ObjectId;
  to_users: ObjectId[];
  read_by: ObjectId[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
```

### Customer Model
```typescript
interface ICustomer {
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
  userType?: number;
  is_account_enabled?: boolean;
  is_blocked?: boolean;
  freeSignUp?: boolean;
  freeStudyGuide?: boolean;
}
```

### Invoice Model
```typescript
interface IInvoice {
  _id: string;
  customerId: string;
  customerEmail: string;
  siteName: string;
  products: IInvoiceProduct[];
  dueDate: string;
  coupon: string;
  agentName: string;
  agentId: ObjectId;
  subtotal: number;
  discount: number;
  totalPrice: number;
  invoiceNumber: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  percent_off?: string;
  hostedUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## TypeScript Interfaces

### API Response Types
```typescript
interface ApiResponse {
  salesPeople: SalesPerson[];
  totals: DashboardTotals;
  lastUpdated?: string;
  salesperson?: SalesPerson;
  dateRange?: { startDate: string; endDate: string };
}

interface SalesPerson {
  id: string;
  name: string;
  assigned: number;
  contacted: number;
  solved: number;
  closed: number;
  progress: number;
  avatar?: string;
  performance?: "increasing" | "decreasing" | "stable";
  orderCreations: number;
  abandonedCarts: number;
  contactUs: number;
  freeSignups: number;
  freeStudyGuides: number;
  scholarship: number;
}
```

### Form & Request Types
```typescript
interface CreateCustomerRequest {
  site_name: string;
  email: string;
  fullName?: string;
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
}

interface CreateInvoiceRequest {
  customerId: string;
  customerEmail: string;
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
```

---

## Controllers

### Lead Controller
**File**: `src/controllers/leadController.ts`

**Methods**:
- `getAllLeads()`: Fetch all leads with population
- `getLeadsByUser(userId)`: Fetch user-specific leads
- `createLead()`: Create new lead
- `updateLeadStatus()`: Update lead status
- `assignLeadToUser()`: Assign lead to user
- `deleteLead()`: Delete single lead
- `batchDeleteLeads()`: Delete multiple leads
- `createCustomLead()`: Create custom lead

**Issues**:
- ❌ Inconsistent error handling
- ❌ No input validation
- ❌ Hard-coded population logic
- ❌ Performance issues with Lead.exists() calls

### Dashboard Controller
**File**: `src/controllers/dashboardController.ts`

**Methods**:
- `getDashboardMetrics()`: Admin dashboard data
- `getSalespersonMetrics()`: Individual salesperson data

**Issues**:
- ❌ Complex aggregation logic in controller
- ❌ Random performance data generation
- ❌ No caching mechanism

### User Controller
**File**: `src/controllers/userController.ts`

**Methods**:
- `getUsers()`: Get users based on permissions

**Issues**:
- ❌ Simple permission logic
- ❌ No user filtering options

### Customer Controller
**File**: `src/controllers/customerController.ts`

**Methods**:
- `createCustomer()`: Create customer in external system
- `checkCustomerExists()`: Check if customer exists

**Issues**:
- ❌ Complex database connection logic
- ❌ Hard-coded database mappings
- ❌ No connection pooling optimization

### Order Controller
**File**: `src/controllers/orderController.ts`

**Methods**:
- `createOrder()`: Create order and corresponding lead
- `getAllOrders()`: Fetch orders with pagination
- `getOrderById()`: Get specific order

**Issues**:
- ❌ Mixed business logic (order + lead creation)
- ❌ No transaction handling

### Invoice Controller
**File**: `src/controllers/invoiceController.ts`

**Methods**:
- `createInvoice()`: Create invoice
- `updateInvoiceStatus()`: Update invoice status

---

## Issues & Recommendations

### 🔐 Security Issues

1. **Password Security**
   - ❌ Plain text password storage
   - ❌ Plain text password comparison
   - **Fix**: Implement bcrypt hashing

2. **Authentication**
   - ❌ No rate limiting on login
   - ❌ No password complexity requirements
   - **Fix**: Add rate limiting and password policies

3. **Authorization**
   - ❌ Inconsistent permission checks
   - **Fix**: Implement middleware for role-based access

### 📊 Performance Issues

1. **Database Queries**
   - ❌ N+1 query problem in lead population
   - ❌ Inefficient `Lead.exists()` calls
   - ❌ No database indexing strategy
   - **Fix**: Optimize queries, add proper indexes

2. **API Response Times**
   - ❌ No caching mechanism
   - ❌ Large payload responses
   - **Fix**: Implement Redis caching, paginate responses

### 🏗️ Architecture Issues

1. **Error Handling**
   - ❌ Inconsistent error response formats
   - ❌ No global error handling
   - **Fix**: Implement standard error response format

2. **Validation**
   - ❌ No input validation middleware
   - ❌ Client-side validation only
   - **Fix**: Add server-side validation with Joi/Zod

3. **Code Organization**
   - ❌ Mixed concerns in controllers
   - ❌ No service layer
   - **Fix**: Implement service layer pattern

### 📝 Data Consistency Issues

1. **Database Design**
   - ❌ Mixed strict/non-strict schemas
   - ❌ Inconsistent field naming
   - **Fix**: Standardize schema definitions

2. **API Contracts**
   - ❌ Inconsistent response formats
   - ❌ Missing required fields validation
   - **Fix**: Implement OpenAPI specification

### 🔄 Business Logic Issues

1. **Lead Management**
   - ❌ Complex category assignment logic
   - ❌ No lead lifecycle management
   - **Fix**: Implement state machine pattern

2. **Notification System**
   - ❌ No notification delivery guarantees
   - ❌ Potential memory leaks in socket connections
   - **Fix**: Implement message queuing system

### 📈 Scalability Issues

1. **Database Connections**
   - ❌ No connection pooling strategy
   - ❌ Multiple database connections per request
   - **Fix**: Implement connection pooling

2. **Real-time Features**
   - ❌ No horizontal scaling for socket connections
   - **Fix**: Implement Redis adapter for Socket.io

### 🛠️ Recommended Improvements

1. **Immediate Fixes**
   - Implement password hashing
   - Add input validation
   - Standardize error responses
   - Add database indexes

2. **Short-term Improvements**
   - Implement caching layer
   - Add comprehensive logging
   - Create API documentation
   - Add unit tests

3. **Long-term Enhancements**
   - Microservices architecture
   - Event-driven architecture
   - Implement CQRS pattern
   - Add monitoring and alerting

---

## Conclusion

The Sales CMS has a solid foundation but requires significant improvements in security, performance, and architecture. The immediate focus should be on security vulnerabilities and performance optimization, followed by architectural improvements for better maintainability and scalability.

**Priority Order**:
1. Security fixes (password hashing, authentication)
2. Performance optimization (database queries, caching)
3. Code organization (service layer, validation)
4. Scalability improvements (connection pooling, monitoring) 