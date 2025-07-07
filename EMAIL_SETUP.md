# Email Configuration for LVM Functionality

This document explains how to configure email sending for the LVM (Left Voice Message) functionality in the Sales CRM.

## Prerequisites

The system uses **Nodemailer** with Gmail SMTP service to send emails. You'll need:

1. A Gmail account for sending emails
2. An App Password for Gmail (recommended) or regular password
3. Environment variables configured

## Setup Steps

### 1. Configure Gmail App Password (Recommended)

For security, use Gmail App Passwords instead of your regular password:

1. **Enable 2-Factor Authentication** on your Gmail account
2. Go to Google Account settings → Security → 2-Step Verification
3. Generate an **App Password**:
   - Go to App passwords
   - Select "Mail" and your device
   - Copy the generated 16-character password

### 2. Update Environment Variables

Edit your `.env` file and configure domain-specific SMTP settings:

```env
# OES Domain SMTP Configuration
PMTA_HOST_OES=mail.oshaeducationschool.com
PMTA_USERNAME_OES=Support
PMTA_PASSWORD_OES=Iqqjv!bs1!!!
PMTA_PORT_OES=587
PMTA_FROM_OES=Support@oshaeducationschool.com
PMTA_FROM_NAME_OES=OSHA Support

# OOC Domain SMTP Configuration
PMTA_HOST_OOC=mail.allinend.com
PMTA_USERNAME_OOC=support@oshaonlinecenter.com
PMTA_PASSWORD_OOC=Iqqjvbs1!
PMTA_PORT_OOC=587
PMTA_FROM_OOC=support@oshaonlinecenter.com
PMTA_FROM_NAME_OOC=OSHA Support

# OOR Domain SMTP Configuration
PMTA_HOST_OOR=mail.oshaoutreachcourses.com
PMTA_USERNAME_OOR=support@oshaoutreachcourses.com
PMTA_PASSWORD_OOR=Iqqjvb!!22!
PMTA_PORT_OOR=587
PMTA_FROM_OOR=support@oshaoutreachcourses.com
PMTA_FROM_NAME_OOR=OSHA Support

# FOC Domain SMTP Configuration (using Gmail as fallback)
PMTA_HOST_FOC=smtp.gmail.com
PMTA_USERNAME_FOC=support@freeoshacourses.com
PMTA_PASSWORD_FOC=your-foc-app-password
PMTA_PORT_FOC=587
PMTA_FROM_FOC=support@freeoshacourses.com
PMTA_FROM_NAME_FOC=Free OSHA Courses
```

### 3. Domain-Specific SMTP Configuration


#### OOR - OSHA Outreach Courses:
#### OES - OSHA Education School:
#### OOC - OSHA Online Center:
#### FOC - Free OSHA Courses:

## How It Works

1. **User selects LVM status** → Modal opens with lead's email
2. **User composes email** → Fills subject, body, and optional CC
3. **Email is sent** via Nodemailer using configured SMTP
4. **Lead status updates** to LVM automatically
5. **User gets confirmation** notification

## Email Template

The system sends HTML emails with:
- **From:** Your configured email address
- **To:** Lead's email address (automatically filled)
- **CC:** Optional additional recipients
- **Subject:** Editable (default: "Follow-up: Your Recent Inquiry")
- **Body:** Custom message with CRM footer
- **Footer:** Includes Lead ID and system identification

## Testing

To test the email functionality:

1. Set up a test Gmail account
2. Configure the environment variables
3. Select a lead with a valid email
4. Change status to "LVM"
5. Send a test email
6. Check both sent and received emails

## Troubleshooting

### Common Issues:

**"Authentication failed"**
- Check if App Password is correctly configured
- Ensure 2FA is enabled on Gmail
- Verify EMAIL_USER and EMAIL_PASSWORD in .env

**"Connection refused"**
- Check internet connection
- Verify Gmail SMTP is not blocked by firewall
- Try using port 465 with secure: true

**"Invalid login"**
- Use App Password instead of regular password
- Check if "Less secure app access" is enabled (not recommended)

### Error Codes:
- `535`: Authentication failed
- `550`: Mailbox unavailable
- `553`: Invalid email address

## Security Notes

1. **Never commit** .env file to version control
2. **Use App Passwords** instead of regular passwords
3. **Rotate passwords** regularly
4. **Monitor** email sending logs for suspicious activity

## Domain-Specific Email Configuration

The system automatically selects the appropriate sender email and SMTP server based on the lead's domain:

- **OES**: OSHA Education School → `Support@oshaeducationschool.com` (mail.oshaeducationschool.com)
- **OOC**: OSHA Online Center → `support@oshaonlinecenter.com` (mail.allinend.com)
- **OOR**: OSHA Outreach → `support@oshaoutreachcourses.com` (mail.oshaoutreachcourses.com)
- **FOC**: Free OSHA Courses → `support@freeoshacourses.com` (smtp.gmail.com)

Each domain uses its own SMTP server and authentication credentials.

## API Endpoint

The email functionality is handled by: `/api/send-email`

**Request:**
```json
{
  "to": "lead@email.com",
  "cc": "manager@company.com",
  "subject": "Follow-up: Your Recent Inquiry",
  "body": "Email content here",
  "leadId": "lead123",
  "domain": "OOR"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email sent successfully",
  "emailId": "message-id-from-smtp",
  "response": "250 OK"
}
``` 