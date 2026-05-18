import ManagerLead from "@/models/managerLead";
import EmailLog from "@/models/email";
import User from "@/models/user";
import { getUserSMTPConfig, getDomainSMTPConfig } from "@/utils/helper";
import * as XLSX from "xlsx";
import nodemailer from "nodemailer";

async function parseXLSXFile(file: File): Promise<string[][]> {
  const arrayBuffer = await file.arrayBuffer();
  const data = new Uint8Array(arrayBuffer);
  const workbook = XLSX.read(data, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
}

function parseCSVText(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentField = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    if (char === '"') {
      if (inQuotes && csvText[i + 1] === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && csvText[i + 1] === "\n") i++;
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
      continue;
    }
    currentField += char;
  }

  currentRow.push(currentField);
  if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0].trim() !== "")) {
    rows.push(currentRow);
  }
  return rows.map(r => r.map(c => c.trim()));
}

async function parseCSVFile(file: File): Promise<string[][]> {
  const csvText = await file.text();
  const parsed = parseCSVText(csvText);
  if (parsed.length < 2) throw new Error("CSV file must have at least a header and one data row");
  return parsed;
}

function findHeaderRow(data: string[][]): number {
  const patterns = ["company name", "company", "email", "phone", "contact", "first name", "last name"];
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    const rowText = row.join(" ").toLowerCase();
    let match = 0;
    for (const p of patterns) if (rowText.includes(p)) match++;
    if (match >= 2) return i;
  }
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row && row.length > 0 && row.some(cell => cell && cell.trim())) return i;
  }
  return 0;
}

async function processBatch(leads: any[], batchSize = 100) {
  const results = [];
  for (let i = 0; i < leads.length; i += batchSize) {
    const batch = leads.slice(i, i + batchSize);
    const batchResults = await ManagerLead.insertMany(batch, { ordered: false });
    results.push(...batchResults);
  }
  return results;
}

export async function uploadManagerLeadsCSV(file: File, userId?: string, sourceLabel?: string) {
  try {
    if (file.size > 50 * 1024 * 1024) {
      return {
        success: false,
        message: "File too large. Maximum size is 50MB.",
        totalRecords: 0,
        importedRecords: 0,
        failedRecords: 0,
        errors: ["File size exceeds 50MB limit"],
      };
    }

    const allowedTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(csv|xlsx|xls)$/i)) {
      return {
        success: false,
        message: "Invalid file type. Please upload CSV or Excel files only.",
        totalRecords: 0,
        importedRecords: 0,
        failedRecords: 0,
        errors: ["Invalid file type"],
      };
    }

    const ext = file.name.toLowerCase().split(".").pop();
    const data = ext === "xlsx" || ext === "xls" ? await parseXLSXFile(file) : await parseCSVFile(file);

    if (data.length < 2) {
      return {
        success: false,
        message: "File must have at least a header and one data row",
        totalRecords: 0,
        importedRecords: 0,
        failedRecords: 0,
        errors: ["Invalid file format"],
      };
    }

    const headerRowIndex = findHeaderRow(data);
    const header = data[headerRowIndex].map(h => h.trim().toLowerCase());
    const headerLength = header.length;

    const fieldMap: Record<string, string> = {
      "company name": "companyName",
      "companyname": "companyName",
      "company": "companyName",
      "contact": "contactNo",
      "phone": "contactNo",
      "phone number": "contactNo",
      "email": "companyEmail",
      "company email": "companyEmail",
      "first name": "firstName",
      "firstname": "firstName",
      "last name": "lastName",
      "lastname": "lastName",
      "notes": "notes",
    };

    const leads: any[] = [];
    const errors: string[] = [];

    for (let i = headerRowIndex + 1; i < data.length; i++) {
      const rowRaw = data[i];
      if (!rowRaw) continue;
      const row = [
        ...rowRaw.slice(0, headerLength),
        ...Array(Math.max(0, headerLength - rowRaw.length)).fill(""),
      ];
      if (!row || row.every(cell => !cell || cell.trim() === "")) continue;

      try {
        const lead: any = {};
        header.forEach((field, idx) => {
          const targetKey = fieldMap[field];
          if (!targetKey) return;
          const value = (row[idx] ?? "").toString().trim();
          if (!value) return;
          if (targetKey === "companyEmail") lead[targetKey] = value.toLowerCase();
          else lead[targetKey] = value;
        });

        if (!lead.companyName || lead.companyName.trim() === "") {
          lead.companyName = "Unknown Company";
        }

        if (userId) lead.uploadedBy = userId;
        if (sourceLabel) lead.source = sourceLabel;

        leads.push(lead);
      } catch (err) {
        errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    const batchSize = leads.length > 1000 ? 500 : 100;
    const imported = await processBatch(leads, batchSize);

    return {
      success: true,
      message: `Successfully imported ${imported.length} manager leads`,
      totalRecords: data.length - headerRowIndex - 1,
      importedRecords: imported.length,
      failedRecords: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error("Manager lead upload error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred",
      totalRecords: 0,
      importedRecords: 0,
      failedRecords: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

// Daily per-user assignment cap for manager leads
export const MANAGER_LEAD_DAILY_QUOTA = 30;

// Fetch the next pending unassigned manager lead and self-assign it
export async function getNextManagerLead(userId: string, userAssignedDomain?: string) {
  try {
    // Enforce daily quota (American Eastern day boundary)
    const now = new Date();
    const americanTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const startOfTodayAmerican = new Date(
      americanTime.getFullYear(),
      americanTime.getMonth(),
      americanTime.getDate()
    );

    const todayCount = await ManagerLead.countDocuments({
      assignedTo: userId,
      assigned: true,
      assignedAt: { $gte: startOfTodayAmerican },
    });

    if (todayCount >= MANAGER_LEAD_DAILY_QUOTA) {
      return {
        success: false,
        message: `Daily quota reached (${MANAGER_LEAD_DAILY_QUOTA} manager leads per day). Try again tomorrow.`,
        lead: null,
      };
    }

    const lead = await ManagerLead.findOne({
      status: "pending",
      assigned: { $ne: true },
      assignedAt: { $exists: false },
    })
      .populate("emails")
      .sort({ createdAt: 1 });

    if (!lead) {
      return { success: false, message: "No manager leads available", lead: null };
    }

    const updateData: any = {
      lastContacted: new Date(),
      updatedAt: new Date(),
      assigned: true,
      assignedTo: userId,
      assignedAt: new Date(),
    };
    if (userAssignedDomain) updateData.domain = userAssignedDomain;

    const updated = await ManagerLead.findByIdAndUpdate(lead._id, updateData, { new: true }).populate("emails");

    return { success: true, lead: updated, message: "Manager lead assigned" };
  } catch (error) {
    console.error("Get manager lead error:", error);
    return { success: false, message: "Error fetching manager lead", lead: null };
  }
}

// Merge-update a manager lead (mirrors company-lead update)
export async function updateManagerLead(id: string, newData: any, userId?: string) {
  try {
    const oldLead = await ManagerLead.findById(id);
    if (!oldLead) return { success: false, message: "Lead not found" };

    const mergedData: any = {};
    const oldObj = oldLead.toObject();
    Object.keys(oldObj).forEach(key => {
      mergedData[key] = (oldObj as any)[key];
    });

    Object.keys(newData).forEach(key => {
      if (newData[key] !== undefined && newData[key] !== "") {
        mergedData[key] = newData[key];
      }
    });

    mergedData.updatedAt = new Date();

    if (userId && !oldLead.assigned) {
      mergedData.assigned = true;
      mergedData.assignedTo = userId;
      mergedData.assignedAt = new Date();
    }

    if (newData.status && newData.status !== oldLead.status) {
      mergedData.lastStatusChange = new Date();
    }

    let pushOperations: any = null;
    if (newData.nextFollowUp && Array.isArray(newData.contactTypes) && newData.contactTypes.length > 0) {
      const followUp = {
        date: new Date(newData.nextFollowUp),
        contact_type: newData.contactTypes,
        notes: newData.notes || "",
        status: newData.status || "scheduled",
      };

      pushOperations = {
        next_follow_up: followUp,
        contactHistory: {
          date: new Date(),
          type: newData.contactTypes,
          notes: newData.notes || "",
          status: newData.status || oldLead.status,
          by: userId,
        },
      };

      mergedData.lastContacted = new Date();
      delete mergedData.nextFollowUp;
      delete mergedData.contactTypes;
    }

    let updated;
    if (pushOperations) {
      await ManagerLead.findByIdAndUpdate(id, { $push: pushOperations });
      updated = await ManagerLead.findByIdAndUpdate(id, mergedData, {
        new: true,
        runValidators: true,
      }).populate({ path: "emails" });
    } else {
      updated = await ManagerLead.findByIdAndUpdate(id, mergedData, {
        new: true,
        runValidators: true,
      }).populate({ path: "emails" });
    }

    return { success: true, lead: updated, message: "Lead updated successfully" };
  } catch (error) {
    console.error("Update manager lead error:", error);
    return { success: false, message: "Error updating lead" };
  }
}

export async function updateManagerLeadStatus(
  leadId: string,
  statusData: {
    statusCategory: string;
    resolveStatus: string;
    notes?: string;
    followUp?: boolean;
    followUpDate?: Date;
    emailData?: {
      from: string;
      to: string;
      cc?: string;
      subject: string;
      body: string;
      send: boolean;
    };
  },
  userId?: string
) {
  try {
    const lead = await ManagerLead.findById(leadId);
    if (!lead) return { success: false, message: "Lead not found" };

    let mainStatus = "processing";
    if (statusData.statusCategory === "Rejection") {
      mainStatus = "closed";
    } else if (statusData.followUp) {
      mainStatus = "follow_up";
    } else if (["Trial Training", "Schedule Meeting", "Already Our Customer"].includes(statusData.resolveStatus)) {
      mainStatus = "resolved";
    }

    const resolveHistoryEntry = {
      date: new Date(),
      statusCategory: statusData.statusCategory,
      status: mainStatus,
      resolveStatus: statusData.resolveStatus,
      notes: statusData.notes || "",
      followUp: statusData.followUp || false,
      followUpDate: statusData.followUpDate,
      emailSent: statusData.emailData?.send || false,
      by: userId,
    };

    const updateData: any = {
      statusCategory: statusData.statusCategory,
      resolveStatus: statusData.resolveStatus,
      status: mainStatus,
      lastStatusChange: new Date(),
      lastContacted: new Date(),
      $push: {
        resolveHistory: resolveHistoryEntry,
      },
    };

    if (userId && !lead.assigned) {
      updateData.assigned = true;
      updateData.assignedTo = userId;
      updateData.assignedAt = new Date();
    }

    if (statusData.followUp && statusData.followUpDate) {
      const followUpEntry = {
        date: statusData.followUpDate,
        contact_type: ["call"] as ("chat" | "email" | "call")[],
        notes: statusData.notes || "",
        status: "scheduled",
      };
      updateData.$push = {
        ...updateData.$push,
        next_follow_up: followUpEntry,
      };
    }

    const updatedLead = await ManagerLead.findByIdAndUpdate(leadId, updateData, {
      new: true,
      runValidators: true,
    }).populate("emails");

    let emailResult = null;
    if (statusData.emailData?.send && statusData.emailData.from && statusData.emailData.to) {
      try {
        const emailDomain = statusData.emailData.from.split("@")[1];
        const domainMapping: Record<string, string> = {
          "oshaoutreachcourses.com": "OOR",
          "oshaeducationschool.com": "OES",
          "oshaonlinecenter.com": "OOC",
        };
        const domain = domainMapping[emailDomain] || "OOR";

        const userData = await User.findById(userId);
        if (!userData) {
          emailResult = { success: false, message: "User not found" };
        } else {
          const smtpConfig = getUserSMTPConfig(userData, domain);
          if (smtpConfig && smtpConfig.user && smtpConfig.password) {
            const transporter = nodemailer.createTransport({
              host: smtpConfig.host,
              port: smtpConfig.port,
              secure: false,
              auth: { user: smtpConfig.user, pass: smtpConfig.password },
            });

            // Build CC list: configured CC (user-specific, falling back to domain) + any user-supplied extras
            const configuredCc = smtpConfig.cc || getDomainSMTPConfig(domain)?.cc || "";
            const extraCc = (statusData.emailData.cc || "")
              .split(",")
              .map(s => s.trim())
              .filter(Boolean);
            const ccList = [
              ...(configuredCc ? [configuredCc] : []),
              ...extraCc,
            ];
            const ccAddress = ccList.length > 0 ? ccList.join(", ") : undefined;

            const mailOptions = {
              from: `${smtpConfig.name} <${smtpConfig.from}>`,
              to: statusData.emailData.to,
              cc: ccAddress,
              subject: statusData.emailData.subject,
              html: statusData.emailData.body,
            };

            const info = await transporter.sendMail(mailOptions);

            const emailLog = new EmailLog({
              to: statusData.emailData.to,
              subject: statusData.emailData.subject,
              body: statusData.emailData.body,
              agentId: userId,
              sentAt: new Date(),
            });
            const savedEmailLog = await emailLog.save();

            await ManagerLead.findByIdAndUpdate(leadId, {
              $push: { emails: savedEmailLog._id },
            });

            emailResult = { success: true, messageId: info.messageId, message: "Email sent successfully" };
          } else {
            emailResult = { success: false, message: `Email service not configured for ${domain} domain` };
          }
        }
      } catch (emailError) {
        console.error("Manager lead email error:", emailError);
        emailResult = { success: false, message: "Failed to send email" };
      }
    }

    return { success: true, lead: updatedLead, emailResult, message: "Lead status updated successfully" };
  } catch (error) {
    console.error("Update manager lead status error:", error);
    return { success: false, message: "Error updating lead status" };
  }
}
