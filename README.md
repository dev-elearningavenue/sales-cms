# sales-cms
FHS special admin only panel to contact leads

# Lead Management System

## Features
- Real-time updates via WebSockets
- Lead assignment and tracking
- Status management with progression rules
- User notifications for lead changes
- Role-based permissions

## Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/lead-management.git
cd lead-management
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory with the following variables:
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

4. Start the development server:
```bash
npm run dev
```

## WebSocket Setup
This application uses Socket.IO for real-time updates. The WebSocket server is initialized in the custom server.js file. To use the custom server instead of the default Next.js server:

```bash
node server.js
```

## Status Management System
The lead management system includes a structured status progression:

1. **Status Hierarchy**:
   - Initial statuses: "Pending"
   - Follow-up stages: "Follow Up 1" → "Follow Up 2" → "Follow Up 3"
   - Resolution statuses: "Converted", "Resolved", "Assigned Order", "Paid"

2. **Status Rules**:
   - Leads can only progress forward in the follow-up sequence
   - Once a lead has a resolution status, it cannot be changed back
   - Different lead categories have different available statuses

## Lead Categories
Each lead category has specific status progression options:
- Order Creation: "Pending" → "Assigned Order"
- Contact Us, Scholarship, Free SignUp, Free Study Guide: "Pending" → "Resolved"
- Abandoned Cart, Custom Lead: Full progression including follow-ups and conversion

## Technologies Used
- Next.js 14
- MongoDB with Mongoose
- Socket.IO for real-time updates
- Tailwind CSS
- TypeScript
