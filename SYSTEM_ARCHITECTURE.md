# Company Leads System - Architecture & Data Flow

## 🏗️ Overall System Hierarchy

```
📁 Sales-CMS/
├── 🎯 Main Pages
│   ├── /company-leads (Main Lead Management)
│   ├── /company-leads/[id] (Individual Lead Details)
│   └── /my-assigned-leads (User's Assigned Leads)
│
├── 🔧 API Routes
│   ├── /api/company-leads (POST: CSV Upload, GET: Get Lead)
│   ├── /api/company-leads/[id] (GET, PUT, DELETE)
│   ├── /api/company-leads/[id]/status (PUT: Status Updates)
│   ├── /api/company-leads/stats (GET: Statistics)
│   ├── /api/company-leads/assigned-count (GET: User Quotas)
│   └── /api/company-leads/my-assigned (GET: User's Leads)
│
├── 🎨 Reusable Components
│   ├── StatusDropdown (Category → Resolve Status Selection)
│   ├── StatusUpdateModal (Dynamic Status Update Form)
│   ├── ResolveHistory (Status Change History Display)
│   ├── FollowUpModal (Follow-up & Contact Info)
│   ├── CSVUploadModal (File Upload Interface)
│   └── CompanyLeadStats (Statistics Dashboard)
│
├── 🧠 Controllers
│   └── companyLeadController.ts (Business Logic)
│
├── 📊 Models & Types
│   ├── CompanyLead (MongoDB Schema)
│   ├── User (Extended with assignedDomain)
│   └── TypeScript Interfaces
│
└── 🔄 Constants
    └── statusHierarchy.ts (Status Configuration)
```

## 🔄 Data Flow Architecture

### 1. **Lead Management Flow**

```
📤 CSV Upload → 🎯 Lead Assignment → 📊 Status Updates → 📈 Statistics

┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   CSVUploadModal │───▶│ companyLeadController │───▶│   Database     │
│                 │    │                  │    │                 │
│ • File Validation│    │ • Parse CSV/XLSX │    │ • CompanyLead   │
│ • Header Detection│   │ • Data Mapping   │    │ • User          │
│ • Batch Processing│   │ • Auto-assignment│   │ • Email Logs    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### 2. **Status Update Hierarchy**

```
🎯 StatusDropdown → 📋 StatusUpdateModal → 🔄 Controller → 💾 Database

┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  StatusDropdown │───▶│ StatusUpdateModal│───▶│ updateCompanyLead│
│                 │    │                  │    │ Status()        │
│ • Category Select│    │ • Dynamic Fields │   │                 │
│ • Resolve Select │    │ • Email Optional │   │ • Status Logic  │
│ • Two-step Flow │     │ • Follow-up Opt  │   │ • Email Sending │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### 3. **Status Hierarchy Structure**

```
📊 Main Status (5 levels)
├── 🟡 pending (Default)
├── 🔵 processing (In Progress)
├── 🟢 resolved (Completed Successfully)
├── 🔴 closed (Rejected/Invalid)
└── 🟠 follow_up (Scheduled Follow-up)

📋 Status Categories (4 groups)
├── ✅ Interested
│   ├── Trial Training → resolved
│   ├── Schedule Meeting → resolved
│   ├── Send us Quote → processing
│   ├── Send Us Details → processing
│   ├── Email Us I'll forward → processing
│   ├── Schedule Call → processing
│   └── Already Our Customer → resolved
│
├── ❌ Invalid Contact
│   ├── Number not found → closed
│   ├── Not Interested → closed
│   └── Company closed → closed
│
├── ⏰ Delayed Interest
│   ├── Call me later → follow_up
│   ├── Concern person N.A → follow_up
│   ├── Already engaged → follow_up
│   └── LVM → follow_up
│
└── 🚫 Rejection
    └── Hangup → closed
```

## 🎨 Reusable Components Architecture

### **StatusDropdown Component**
```typescript
interface StatusDropdownProps {
  onStatusSelect: (category: StatusCategory, resolveStatus: string) => void;
  disabled?: boolean;
  currentCategory?: string;
  currentResolveStatus?: string;
}

// Usage: Two-step selection process
// Step 1: Select Category (Interested, Invalid Contact, etc.)
// Step 2: Select Resolve Status (Trial Training, Not Interested, etc.)
```

### **StatusUpdateModal Component**
```typescript
interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: StatusUpdateData) => Promise<void>;
  category: StatusCategory;
  resolveStatus: string;
  currentLead: ICompanyLead | null;
  session: any;
  loading: boolean;
}

// Dynamic Fields Based on Category:
// - Interested: Email + Follow-up + Notes
// - Invalid Contact: Notes only
// - Delayed Interest: Email + Follow-up + Notes
// - Rejection: Notes only
```

### **ResolveHistory Component**
```typescript
interface ResolveHistoryProps {
  history: ResolveHistoryEntry[];
  loading: boolean;
}

// Displays chronological status changes with:
// - Date & Time
// - Status Category
// - Resolve Status
// - Notes
// - Email Sent Status
// - Follow-up Information
```

## 🔄 API Data Flow

### **1. Lead Assignment Flow**
```
GET /api/company-leads
├── 🕐 Timezone Check (9:30 AM - 5:00 PM EST)
├── 🗺️ State Selection (Business Hours Only)
├── 📋 Lead Retrieval (Oldest Available)
├── 👤 Auto-assignment (assigned: true, assignedTo: userId)
└── 📊 Response (Single Lead + Metadata)
```

### **2. Status Update Flow**
```
PUT /api/company-leads/[id]/status
├── 🔐 Authentication (getDataFromToken)
├── 📋 Status Processing (updateCompanyLeadStatus)
│   ├── 🎯 Main Status Determination
│   ├── 📝 Resolve History Entry
│   ├── 📧 Email Sending (Optional)
│   └── 📅 Follow-up Scheduling (Optional)
└── 📊 Response (Updated Lead + Email Result)
```

### **3. Statistics Flow**
```
GET /api/company-leads/stats
├── 📊 Status Counts (pending, processing, resolved, closed, followUp)
├── 🗺️ By State Aggregation
├── 🌐 By Domain Aggregation
├── 📋 By Category Aggregation
└── 📈 CompanyLeadStats Response
```

## 🗄️ Database Schema Evolution

### **CompanyLead Model**
```typescript
// Core Fields
companyName: string
companyEmail: string
contactNo: string
address: string
state: string

// Assignment Fields
assigned: boolean
assignedTo: ObjectId
assignedAt: Date
uploadedBy: ObjectId
domain: string

// Status Fields (New Hierarchy)
status: "pending" | "processing" | "resolved" | "closed" | "follow_up"
statusCategory: "Interested" | "Invalid Contact" | "Delayed Interest" | "Rejection"
resolveStatus: string

// History Fields
resolveHistory: Array<{
  date: Date
  statusCategory: string
  status: string
  resolveStatus: string
  notes?: string
  followUp?: boolean
  followUpDate?: Date
  emailSent?: boolean
  by?: ObjectId
}>

// Contact Fields
contactPerson?: string
contactPersonEmail?: string
contactPersonPhone?: string
lastContacted?: Date
lastStatusChange?: Date
```

### **User Model Extension**
```typescript
// Added Field
assignedDomain: string // For email configuration
```

## 🔧 Controller Functions

### **companyLeadController.ts**
```typescript
// Core Functions
uploadCSVData(file, state, source, userId, userAssignedDomain)
getTimezoneBasedLead(userId, userAssignedDomain)
updateCompanyLead(leadId, newData, userId)
updateCompanyLeadStatus(leadId, statusData, userId)
updateLeadWithFollowUp(leadId, followUpData, userId)

// Utility Functions
parseCSVFile(file)
parseXLSXFile(file)
findHeaderRow(data)
getStateName(stateCode)
```

## 🎯 Page-Specific Implementations

### **Main Company Leads Page (/company-leads)**
- ✅ StatusDropdown (Primary Action)
- ✅ StatusUpdateModal (Dynamic Forms)
- ✅ ResolveHistory (Status Tracking)
- ✅ CSVUploadModal (File Import)
- ✅ Lead Display (Current Lead)
- ✅ URL Persistence (?cl=leadId)

### **Individual Lead Page (/company-leads/[id])**
- ✅ StatusDropdown (Replaces Follow Up Button)
- ✅ StatusUpdateModal (Same as Main Page)
- ✅ ResolveHistory (Replaces Contact History)
- ✅ Editable Fields (Company Information)
- ✅ FollowUpModal (Legacy Support)

### **My Assigned Leads Page (/my-assigned-leads)**
- ✅ Lead Table (All User's Leads)
- ✅ Navigation to Individual Pages
- ✅ Status Display
- ✅ Pagination & Filtering

## 🔄 Email Integration

### **Email Configuration**
```typescript
// Domain Mapping
domainShortCodes = {
  "Osha Outreach Courses": "OOR",
  "OSHAPRO": "OSHAPRO", 
  "OSHA Online Center": "OOC"
}

// SMTP Configuration per Domain
getDomainSMTPConfig(domain) → {
  host: string
  port: number
  user: string
  password: string
}
```

### **Email Flow**
```
StatusUpdateModal → Controller → Nodemailer → SMTP Server
├── 📧 Email Composition (CKEditor)
├── 🔐 Domain Authentication
├── 📤 SMTP Transmission
└── 📝 Email Logging
```

## 🎨 UI/UX Patterns

### **Consistent Button Styling**
- 🟦 Primary Actions: Blue (`bg-blue-600`)
- 🟨 Follow-up Actions: Yellow (`bg-yellow-600`)
- 🟩 Save Actions: Green (`bg-green-600`)
- ⚫ Cancel/Back: Gray (`bg-gray-600`)

### **Modal Patterns**
- 📋 StatusUpdateModal: Dynamic fields based on category
- 📅 FollowUpModal: Contact info + email composition
- 📤 CSVUploadModal: File upload + validation
- 📊 All modals: Consistent close/submit patterns

### **Toast Notifications**
- ✅ Success: Green (`success`)
- ❌ Error: Red (`error`)
- ℹ️ Info: Blue (`info`)
- ⚠️ Warning: Yellow (`warning`)

## 🔄 State Management

### **Global State (AppContext)**
- 👤 Session Management
- 🔔 Toast Notifications
- ⏳ Loading States

### **Component State**
- 📋 Form Data (Local useState)
- 🔄 Modal States (Open/Close)
- 📊 Data Fetching (Loading/Error)

This architecture provides a scalable, maintainable system with clear separation of concerns and reusable components throughout the application.
