import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/utils/auth";
import nodemailer from "nodemailer";
import { getDomainSMTPConfig } from "@/utils/helper";
import EmailLog from "@/models/email";
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
    const { to, subject, body, domain } = await req.json();
    // Validate required fields
    if (!to || !subject || !body || !domain) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, body, domain" },
        { status: 400 }
      );
    }
    const smtpConfig = getDomainSMTPConfig(domain);

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

    console.log(
      `Sending email from (${smtpConfig.from}) cc:`,
      smtpConfig.cc,
      "Subject:",
      subject
    );
    // Prepare email options with domain-specific sender
    const mailOptions = {
      from: `${smtpConfig.name} <${smtpConfig.from}>`,
      to: to,
      cc: smtpConfig.cc,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          ${body.replace(/\n/g, "<br>")}
          
          <br><br>
        </div>
      `,
      text: body,
    };

    const emailResult = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", emailResult.messageId);

    // Save email log to DB
    try {
      await EmailLog.create({
        to,
        subject,
        body,
        agentId: new mongoose.Types.ObjectId(decoded.data._id),
        sentAt: new Date(),
      });
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

    // More detailed error handling
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
