import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/utils/auth";
import nodemailer from "nodemailer";
import { getDomainSMTPConfig, getUserSMTPConfig } from "@/utils/helper";
import EmailLog from "@/models/email";
import CompanyLead from "@/models/companyLead";
import mongoose from "mongoose";

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded: any = await verifyToken(token);
    if (!decoded.data._id) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const { to, subject, body, domain, leadId, leadType } = await req.json();
    // Validate required fields
    if (!to || !subject || !body || !domain) {
      return NextResponse.json(
        { error: "Missing required email fields: to, subject, body, domain" },
        { status: 400 }
      );
    }

    let smtpConfig;
    if (leadType === 'outbound' || leadType === 'company-lead') {
      smtpConfig = getUserSMTPConfig(decoded.data, domain);
    } else {
      smtpConfig = getDomainSMTPConfig(domain);
    }

    // Validate domain-specific environment variables
    if (!smtpConfig || !smtpConfig.user || !smtpConfig.password) {
      console.error(
        `SMTP configuration missing for domain ${domain}: Check PMTA_* environment variables for ${domain}`
      );
      return NextResponse.json(
        {
          error: `Email service not configured for ${domain} domain. Please contact administrator.`,
        },
        { status: 500 }
      );
    }

    // Configure nodemailer transporter with domain-specific SMTP settings
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: false,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.password,
      },
    });

    // console.log(`Sending email from (${smtpConfig.from}) to:`,to,"Subject:",subject);
    // Use CKEditor HTML as-is to preserve list/quote structure.
    // Only convert newlines when the body is plain text.
    const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(body || "");
    let htmlBody = looksLikeHtml ? (body || "") : (body || "").replace(/\n/g, "<br>");

    // Targeted cleanup to avoid rendering glitches (empty bullets, poorly styled quotes)
    if (looksLikeHtml) {
      htmlBody = htmlBody
        // Remove empty list items (which Gmail renders as a stray bullet)
        .replace(/<li[^>]*>\s*(?:&nbsp;|<br\s*\/?\s*>|\s)*<\/li>/gi, "")
        // Remove empty lists left after removing empty items
        .replace(/<(ul|ol)[^>]*>\s*<\/\1>/gi, "")
        // Ensure blockquotes have inline styling for consistent email client rendering
        .replace(/<blockquote(?![^>]*style=)/gi, '<blockquote style="margin:12px 0; padding-left:12px; border-left:3px solid #e5e7eb;">');
    }

    // Prepare email options with domain-specific sender
    const mailOptions = {
      from: `${smtpConfig.name} <${smtpConfig.from}>`,
      to: to,
      cc: smtpConfig.cc || undefined,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <style>
            ul { list-style-type: disc; padding-left: 20px; margin: 8px 0; }
            ol { list-style-type: decimal; padding-left: 20px; margin: 8px 0; }
            li { margin: 4px 0; }
            blockquote { margin: 12px 0; padding-left: 12px; border-left: 3px solid #e5e7eb; }
            p { margin: 8px 0; }
            h1,h2,h3 { margin: 12px 0 8px; }
          </style>
          ${htmlBody}
        </div>
      `,
      text: body,
    };

    const emailResult = await transporter.sendMail(mailOptions);
    // console.log("Email sent successfully:", emailResult.messageId);

    // Save email log to DB
    try {
      const emailLog = await EmailLog.create({
        to,
        subject,
        body,
        agentId: new mongoose.Types.ObjectId(decoded.data._id),
        sentAt: new Date(),
      });

      if (leadId) {
        await CompanyLead.findByIdAndUpdate(leadId, {
          $push: {
            emails: emailLog._id
          }
        });
      }
    } catch (err) {
      console.error("Failed to log sent email:", err);
    }

    return NextResponse.json({
      success: true,
      message: "Email sent successfully",
      emailId: emailResult.messageId,
      response: emailResult.response,
    });
  } catch (error: any) {
    console.error("Error sending email:", error);

    let errorMessage = "Failed to send email";
    if (error.code === "EAUTH") {
      errorMessage =
        "Email authentication failed. Please check your email credentials.";
    } else if (error.code === "ENOTFOUND") {
      errorMessage =
        "Email service not found. Please check your network connection.";
    } else if (error.responseCode === 535) {
      errorMessage =
        "Invalid email credentials. Please check EMAIL_USER and EMAIL_PASSWORD.";
    } else if (error.responseCode === 550) {
      errorMessage = "Invalid recipient email address.";
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: error.message || "Unknown error",
        code: error.code || "UNKNOWN",
      },
      { status: 500 }
    );
  }
}
