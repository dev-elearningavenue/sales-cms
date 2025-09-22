import CompanyLead from "@/models/companyLead";
import EmailLog from "@/models/email";
import { getStateName } from "@/utils/stateMapping";
import { getDomainSMTPConfig } from "@/utils/helper";
import * as XLSX from 'xlsx';
import nodemailer from 'nodemailer';

// Parse XLSX file using Buffer (server-side)
async function parseXLSXFile(file: File): Promise<string[][]> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
    return jsonData;
  } catch (error) {
    throw new Error(`Failed to parse XLSX file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Robust CSV text parser supporting commas and newlines inside quoted fields
function parseCSVText(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentField = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];

    if (char === '"') {
      // Handle escaped quotes within quoted field
      if (inQuotes && csvText[i + 1] === '"') {
        currentField += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      // Finish field and row on newline (handle CRLF)
      if (char === '\r' && csvText[i + 1] === '\n') i++;
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
      continue;
    }

    currentField += char;
  }

  // Push last field/row
  currentRow.push(currentField);
  if (currentRow.length > 1 || (currentRow.length === 1 && currentRow[0].trim() !== "")) {
    rows.push(currentRow);
  }

  // Trim whitespace from all cells
  return rows.map(r => r.map(c => c.trim()));
}

// Parse CSV file using text (server-side)
async function parseCSVFile(file: File): Promise<string[][]> {
  try {
    const csvText = await file.text();
    const parsedData = parseCSVText(csvText);
    if (parsedData.length < 2) {
      throw new Error("CSV file must have at least a header and one data row");
    }
    return parsedData;
  } catch (error) {
    throw new Error(`Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Find the header row by looking for common header patterns
function findHeaderRow(data: string[][]): number {
  const headerPatterns = [
    'company name', 'company email', 'phone number', 'address', 'state',
    'company', 'email', 'phone', 'contact', 'location'
  ];
  
  for (let i = 0; i < Math.min(10, data.length); i++) { // Check first 10 rows
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    const rowText = row.join(' ').toLowerCase();
    let matchCount = 0;
    
    for (const pattern of headerPatterns) {
      if (rowText.includes(pattern)) {
        matchCount++;
      }
    }
    
    // If we find at least 2 header patterns, this is likely the header row
    if (matchCount >= 2) {
      console.log(`Found header row at index ${i}:`, row);
      return i;
    }
  }
  
  // If no header found, use first non-empty row
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (row && row.length > 0 && row.some(cell => cell && cell.trim())) {
      console.log(`Using first non-empty row as header at index ${i}:`, row);
      return i;
    }
  }
  
  return 0; // Fallback to first row
}

async function processLeadsBatch(leads: any[], batchSize: number = 100) {
  const results = [];
  for (let i = 0; i < leads.length; i += batchSize) {
    const batch = leads.slice(i, i + batchSize);
    const batchResults = await CompanyLead.insertMany(batch, { ordered: false });
    results.push(...batchResults);
    
    // Log progress for large files
    if (leads.length > 1000) {
      console.log(`Processed ${Math.min(i + batchSize, leads.length)} of ${leads.length} leads`);
    }
  }
  return results;
}

// Upload CSV/XLSX data with parallel processing
export async function uploadCSVData(file: File, state?: string, userId?: string, userAssignedDomain?: string) {
  try {
    console.log(`Starting file upload: ${file.name}, size: ${file.size} bytes`);
    
    // Check file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      return {
        success: false,
        message: "File too large. Maximum size is 50MB.",
        totalRecords: 0,
        importedRecords: 0,
        failedRecords: 0,
        errors: ["File size exceeds 50MB limit"]
      };
    }
    
    // Check file type
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(csv|xlsx|xls)$/i)) {
      return {
        success: false,
        message: "Invalid file type. Please upload CSV or Excel files only.",
        totalRecords: 0,
        importedRecords: 0,
        failedRecords: 0,
        errors: ["Invalid file type"]
      };
    }
    
    let data: string[][];
    const fileExtension = file.name.toLowerCase().split('.').pop();
    
    if (fileExtension === 'xlsx') {
      data = await parseXLSXFile(file);
    } else {
      data = await parseCSVFile(file);
    }
    
    if (data.length < 2) {
      return {
        success: false,
        message: "File must have at least a header and one data row",
        totalRecords: 0,
        importedRecords: 0,
        failedRecords: 0,
        errors: ["Invalid file format"]
      };
    }
    
    // Find the actual header row
    const headerRowIndex = findHeaderRow(data);
    const header = data[headerRowIndex].map(h => h.trim().toLowerCase());
    console.log("Total rows to process:", data.length - headerRowIndex - 1);
    
    // Process data rows (skip header row and any empty rows before it)
    const leads: any[] = [];
    const errors: string[] = [];
    let rowNumber = headerRowIndex + 1;

    // Normalize header length so each row maps correctly even if trailing columns are missing
    const headerLength = header.length;

    for (let i = headerRowIndex + 1; i < data.length; i++) {
      rowNumber = i + 1;
      const rowRaw = data[i];
      if (!rowRaw) continue;

      // If row has fewer columns than header, pad with empty strings
      // If row has more (rare), slice extra cells
      const row = [
        ...rowRaw.slice(0, headerLength),
        ...Array(Math.max(0, headerLength - rowRaw.length)).fill("")
      ];
      
      if (!row || row.every(cell => !cell || cell.trim() === '')) continue;
      
      try {
        const rowData: any = {};
        header.forEach((field, index) => {
          rowData[field] = (row[index] ?? "").toString().trim();
        });

        // Build lead by mapping CSV keys to model keys; leave missing keys unset so defaults apply
        const lead: any = {};

        const fieldMap: Record<string, string> = {
          "company name": "companyName",
          "company": "companyName",
          "company email": "companyEmail",
          "email": "companyEmail",
          "phone number": "contactNo",
          "phone": "contactNo",
          "contact": "contactNo",
          "address": "address",
          "company address": "address",
          "state": "state",
          "location": "state",
          "city": "city",
          "zip code": "zipCode",
          "zipcode": "zipCode",
          "postal code": "zipCode",
          "country": "country",
          "industry": "industry",
          "sector": "industry",
          "company size": "companySize",
          "companysize": "companySize",
          "size": "companySize",
          "contact person": "contactPerson",
          "notes": "notes",
          "description": "notes",
          "website": "companyWebsite",
          "company website": "companyWebsite",
          "Company Website": "companyWebsite",
        };

        // Prefer body state if provided
        if (state) {
          const normalizedBodyState = getStateName(String(state));
          if (normalizedBodyState) lead.state = normalizedBodyState;
        }

        if (userId) lead.uploadedBy = userId as any;
        // if (userAssignedDomain) lead.domain = userAssignedDomain;

        for (const [key, raw] of Object.entries(rowData)) {
          const lc = key.toLowerCase();
          const targetKey = fieldMap[lc];
          if (!targetKey) continue;
          const value = typeof raw === "string" ? raw.trim() : String(raw ?? "").trim();
          if (!value) continue; // keep undefined to allow defaults
          if (targetKey === "companyEmail") {
            lead[targetKey] = value.toLowerCase();
          } else if (targetKey === "state") {
            const normalized = getStateName(value);
            if (normalized) lead.state = normalized;
          } else {
            lead[targetKey] = value;
          }
        }

        if (!lead.companyName || lead.companyName.trim() === "") {
          lead.companyName = "Unknown Company";
        }
        
        // Handle social media links
        if (rowData["socials"] || rowData["social media"] || rowData["company linkedin"]) {
          try {
            const socialsData = JSON.parse(rowData["socials"] || rowData["social media"] || "{}");
            lead.socials = socialsData;
          } catch (e) {
            lead.socials = {
              linkedin: rowData["socials"] || rowData["social media"] || rowData["company linkedin"]
            };
          }
        }
        
        leads.push(lead);
        
        if (rowNumber % 1000 === 0) {
          console.log(`Processed ${rowNumber} rows, created ${leads.length} leads`);
        }
        
      } catch (error) {
        console.error(`Row ${rowNumber}: Error processing row:`, error);
        errors.push(`Row ${rowNumber}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }
    
    // Insert leads in batches for better performance
    console.log(`Attempting to insert ${leads.length} leads into database`);
    const batchSize = leads.length > 1000 ? 500 : 100;
    const importedLeads = await processLeadsBatch(leads, batchSize);
    console.log(`Successfully inserted ${importedLeads.length} leads`);
    
    return {
      success: true,
      message: `Successfully imported ${importedLeads.length} leads`,
      totalRecords: data.length - headerRowIndex - 1,
      importedRecords: importedLeads.length,
      failedRecords: errors.length,
      errors: errors.length > 0 ? errors : undefined
    };
    
  } catch (error) {
    console.error("Upload error:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred",
      totalRecords: 0,
      importedRecords: 0,
      failedRecords: 0,
      errors: [error instanceof Error ? error.message : "Unknown error"]
    };
  }
}

// Get timezone-based lead with improved logic
export async function getTimezoneBasedLead(userId?: string, userAssignedDomain?: string) {
  try {
    // Get all US states with their timezones
    const stateTimezones: { [key: string]: string } = {
      'Alabama': 'America/Chicago', 'Alaska': 'America/Anchorage', 'Arizona': 'America/Phoenix',
      'Arkansas': 'America/Chicago', 'California': 'America/Los_Angeles', 'Colorado': 'America/Denver',
      'Connecticut': 'America/New_York', 'Delaware': 'America/New_York', 'Florida': 'America/New_York',
      'Georgia': 'America/New_York', 'Hawaii': 'Pacific/Honolulu', 'Idaho': 'America/Boise',
      'Illinois': 'America/Chicago', 'Indiana': 'America/Indiana/Indianapolis', 'Iowa': 'America/Chicago',
      'Kansas': 'America/Chicago', 'Kentucky': 'America/New_York', 'Louisiana': 'America/Chicago',
      'Maine': 'America/New_York', 'Maryland': 'America/New_York', 'Massachusetts': 'America/New_York',
      'Michigan': 'America/New_York', 'Minnesota': 'America/Chicago', 'Mississippi': 'America/Chicago',
      'Missouri': 'America/Chicago', 'Montana': 'America/Denver', 'Nebraska': 'America/Chicago',
      'Nevada': 'America/Los_Angeles', 'New Hampshire': 'America/New_York', 'New Jersey': 'America/New_York',
      'New Mexico': 'America/Denver', 'New York': 'America/New_York', 'North Carolina': 'America/New_York',
      'North Dakota': 'America/Chicago', 'Ohio': 'America/New_York', 'Oklahoma': 'America/Chicago',
      'Oregon': 'America/Los_Angeles', 'Pennsylvania': 'America/New_York', 'Rhode Island': 'America/New_York',
      'South Carolina': 'America/New_York', 'South Dakota': 'America/Chicago', 'Tennessee': 'America/Chicago',
      'Texas': 'America/Chicago', 'Utah': 'America/Denver', 'Vermont': 'America/New_York',
      'Virginia': 'America/New_York', 'Washington': 'America/Los_Angeles', 'West Virginia': 'America/New_York',
      'Wisconsin': 'America/Chicago', 'Wyoming': 'America/Denver'
    };
    
    const now = new Date();
    const businessHoursStart = 0;
    const businessHoursEnd = 19; // 7:00 PM
    
    // console.log(`🕐 Current server time: ${now.toISOString()}`);
    // console.log(`📅 Business hours: ${businessHoursStart} to ${businessHoursEnd}`);
    
    // Check each state systematically
    for (const [stateName, timezone] of Object.entries(stateTimezones)) {
      try {
        const stateTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
        const stateHour = stateTime.getHours() + stateTime.getMinutes() / 60;
        
        // Check if state is in business hours
        if (stateHour >= businessHoursStart && stateHour <= businessHoursEnd) {
          console.log(`✅ ${stateName} (${timezone}) - Current time: ${stateHour.toFixed(2)} - IN BUSINESS HOURS`);
          
          const lead = await CompanyLead.findOne({
            state: stateName,
            status: { $in: ["pending"] },
            assigned: { $ne: true },
            $or: [
              { lastContacted: { $exists: false } },
              { lastContacted: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } // Not contacted in last 24 hours
            ]
          }).populate('emails').sort({ createdAt: 1 });
          
          if (lead) {
            console.log(`🎯 Found lead in ${stateName}: ${lead.companyName}`);
            
            // Update lead with assignment and last contacted timestamp
            const updateData: any = {
              lastContacted: new Date(),
              updatedAt: new Date()
            };
            
            // Auto-assign if not already assigned
            if (!lead.assigned && userId) {
              updateData.assigned = true;
              updateData.assignedTo = userId;
              updateData.assignedAt = new Date();
              if (userAssignedDomain) {
                updateData.domain = userAssignedDomain;
              }
            }
            
            const updatedLead = await CompanyLead.findByIdAndUpdate(lead._id, updateData, { new: true }).populate({
              path: "emails",
            });
            
            return {
              success: true,
              lead: updatedLead,
              message: `Found lead in ${stateName}`
            };
          } else {
            console.log(`❌ No available leads in ${stateName} (in business hours but no leads found)`);
          }
        }
      } catch (error) {
        console.error(`Error checking ${stateName}:`, error);
        continue; // Continue with next state
      }
    }
    
    return {
      success: false,
      message: "No leads available in states currently in business hours (9:30 AM - 5:00 PM)",
      lead: null
    };
    
  } catch (error) {
    console.error("Get lead error:", error);
    return {
      success: false,
      message: "Error fetching lead",
      lead: null
    };
  }
}

// Update lead with follow-up and contact history
export async function updateLeadWithFollowUp(leadId: string, updates: any, userId?: string, userAssignedDomain?: string) {
  try {
    const lead = await CompanyLead.findById(leadId);
    if (!lead) {
      return { success: false, message: "Lead not found" };
    }
    
    const updateData: any = {
      ...updates,
      updatedAt: new Date()
    };
    
    // Auto-assign and set domain if not already assigned
    if (userId && userAssignedDomain && !lead.assigned) {
      updateData.assigned = true;
      updateData.assignedTo = userId;
      updateData.assignedAt = new Date();
      updateData.domain = userAssignedDomain;
    }
    
    // Handle status change
    if (updates.status) {
      updateData.lastStatusChange = new Date();
    }
    
    if (updates.newFollowUp) {
      const followUp = {
        date: new Date(),
        contact_type: updates.newFollowUp.contact_type,
        notes: updates.newFollowUp.notes,
        status: updates.newFollowUp.status || "scheduled"
      };
      
      updateData.$push = {
        next_follow_up: followUp,
        contactHistory: {
          date: new Date(),
          type: updates.newFollowUp.contact_type,
          notes: updates.newFollowUp.notes,
          status: updates.status || lead.status,
          by: userId
        }
      };
      
      updateData.lastContacted = new Date();
      delete updateData.newFollowUp;
      
      console.log("Created newFollowUp:", followUp);
    } else if (updates.nextFollowUp && updates.contactTypes && Array.isArray(updates.contactTypes) && updates.contactTypes.length > 0) {
      console.log("Using old format from frontend modal");
      const followUp = {
        date: new Date(updates.nextFollowUp),
        contact_type: updates.contactTypes,
        notes: updates.notes || "",
        status: updates.status || "scheduled"
      };
      
      updateData.$push = {
        next_follow_up: followUp,
        contactHistory: {
          date: new Date(),
          type: updates.contactTypes,
          notes: updates.notes || "",
          status: updates.status || lead.status,
          by: userId
        }
      };
      
      updateData.lastContacted = new Date();
      
      // Don't include these in direct field update
      delete updateData.nextFollowUp;
      delete updateData.contactTypes;
      
      console.log("Created followUp:", followUp);
      console.log("UpdateData.$push:", updateData.$push);
    } else {
      console.log("No follow-up conditions met");
    }
    
    // Handle contact info update
    if (updates.contactInfo) {
      updateData.contactPerson = updates.contactInfo.contactPerson || updates.contactInfo.contactPerson;
      updateData.contactPersonEmail = updates.contactInfo.contactPersonEmail || updates.contactInfo.contactEmail;
      updateData.contactPersonPhone = updates.contactInfo.contactPersonPhone || updates.contactInfo.contactPhone;
      updateData.contactNo = updates.contactInfo.contactNo;
      updateData.companyEmail = updates.contactInfo.companyEmail;
      
      // Add contact history for contact info update
      if (!updateData.$push) {
        updateData.$push = { contactHistory: [] };
      }
      if (Array.isArray(updateData.$push.contactHistory)) {
        updateData.$push.contactHistory = [];
      }
      updateData.$push.contactHistory = {
        date: new Date(),
        type: ["chat"],
        notes: "Contact information updated",
        status: lead.status,
        by: userId
      };
      updateData.lastContacted = new Date();
      delete updateData.contactInfo; // Remove from direct update
    }
    
    console.log("Updating lead with data:", updateData);
    
    const updatedLead = await CompanyLead.findByIdAndUpdate(
      leadId,
      updateData,
      { new: true }
    );
    
    return {
      success: true,
      lead: updatedLead,
      message: "Lead updated successfully"
    };
    
  } catch (error) {
    console.error("Update lead error:", error);
    return {
      success: false,
      message: "Error updating lead"
    };
  }
}

// Update company lead with merge logic
export async function updateCompanyLead(id: string, newData: any, userId?: string) {
  try {
    
    const oldLead = await CompanyLead.findById(id);
    if (!oldLead) {
      return { success: false, message: "Lead not found" };
    }

    // Merge handling - preserve old values if new ones are empty
    const mergedData: any = {};
    const oldLeadObj = oldLead.toObject();
    
    // First, copy all old data
    Object.keys(oldLeadObj).forEach((key) => {
      mergedData[key] = (oldLeadObj as any)[key];
    });
    
    // Then, overwrite with new data where provided and not empty
    Object.keys(newData).forEach((key) => {
      if (key === 'socials') {
        // Special handling for socials object - merge instead of replace
        if (newData[key] && typeof newData[key] === 'object') {
          mergedData[key] = {
            ...(mergedData[key] || {}),
            ...newData[key]
          };
        }
      } else if (newData[key] !== undefined && newData[key] !== "") {
        console.log(`Updating field ${key}: ${newData[key]}`);
        mergedData[key] = newData[key];
      }
    });

    // Always update these fields
    mergedData.updatedAt = new Date();
    
    // Auto-assign and set domain if not already assigned
    if (userId && !oldLead.assigned) {
      mergedData.assigned = true;
      mergedData.assignedTo = userId;
      mergedData.assignedAt = new Date();
      mergedData.domain = oldLead.domain;
    }

    // Handle status change timestamp (only if status actually changed)
    if (newData.status && newData.status !== oldLead.status) {
      mergedData.lastStatusChange = new Date();
    }

    // Handle follow-up separately with $push operation
    let pushOperations = null;
    if (newData.nextFollowUp && newData.contactTypes && Array.isArray(newData.contactTypes) && newData.contactTypes.length > 0) {
      console.log("=== FOLLOW-UP PROCESSING ===");
      
      const followUp = {
        date: new Date(newData.nextFollowUp),
        contact_type: newData.contactTypes,
        notes: newData.notes || "",
        status: newData.status || "scheduled"
      };
      
      pushOperations = {
        next_follow_up: followUp,
        contactHistory: {
          date: new Date(),
          type: newData.contactTypes,
          notes: newData.notes || "",
          status: newData.status || oldLead.status,
          by: userId
        }
      };
      
      mergedData.lastContacted = new Date();
      
      // Don't include these in direct field update
      delete mergedData.nextFollowUp;
      delete mergedData.contactTypes;
    }

    // 4. Update with merged data - separate regular updates from $push operations
    let updated;
    
    if (pushOperations) {
      // If we have follow-up data, do a separate $push operation first
      console.log("Performing $push operation for follow-up");
      await CompanyLead.findByIdAndUpdate(id, { $push: pushOperations });
    
      updated = await CompanyLead.findByIdAndUpdate(id, mergedData, {
        new: true,
        runValidators: true
      }).populate({
        path: "emails",
      });
    } else {
      // No push operations, just regular update
      updated = await CompanyLead.findByIdAndUpdate(id, mergedData, {
        new: true,
        runValidators: true
      }).populate({
        path: "emails",
      });
    }

    return {
      success: true,
      lead: updated,
      message: "Lead updated successfully"
    };

  } catch (error) {
    console.error("Update company lead error:", error);
    return {
      success: false,
      message: "Error updating lead"
    };
  }
}

// Update lead status with hierarchical system and maintain resolve history
export async function updateCompanyLeadStatus(
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
      subject: string;
      body: string;
      send: boolean;
    };
  },
  userId?: string
) {
  try {
    // console.log("Status Data:", JSON.stringify(statusData, null, 2));
    const lead = await CompanyLead.findById(leadId);
    if (!lead) {
      return { success: false, message: "Lead not found" };
    }

    // Determine main status based on category and action
    let mainStatus = "processing";
    if (statusData.statusCategory === "Rejection") {
      mainStatus = "closed";
    } else if (statusData.followUp) {
      mainStatus = "follow_up";
    } else if (["Trial Training", "Schedule Meeting", "Already Our Customer"].includes(statusData.resolveStatus)) {
      mainStatus = "resolved";
    }

    // Create resolve history entry
    const resolveHistoryEntry = {
      date: new Date(),
      statusCategory: statusData.statusCategory,
      status: mainStatus,
      resolveStatus: statusData.resolveStatus,
      notes: statusData.notes || "",
      followUp: statusData.followUp || false,
      followUpDate: statusData.followUpDate,
      emailSent: statusData.emailData?.send || false,
      by: userId
    };

    // Prepare update data
    const updateData: any = {
      statusCategory: statusData.statusCategory,
      resolveStatus: statusData.resolveStatus,
      status: mainStatus,
      lastStatusChange: new Date(),
      lastContacted: new Date(),
      $push: {
        resolveHistory: resolveHistoryEntry
      }
    };

    // Auto-assign if not already assigned
    if (userId && !lead.assigned) {
      updateData.assigned = true;
      updateData.assignedTo = userId;
      updateData.assignedAt = new Date();
    }

    // Handle follow-up
    if (statusData.followUp && statusData.followUpDate) {
      const followUpEntry = {
        date: statusData.followUpDate,
        contact_type: ["call"] as ("chat" | "email" | "call")[],
        notes: statusData.notes || "",
        status: "scheduled"
      };

      updateData.$push = {
        ...updateData.$push,
        nextFollowUp: followUpEntry
      };
    }


    const updatedLead = await CompanyLead.findByIdAndUpdate(leadId, updateData, {
      new: true,
      runValidators: true
    }).populate("emails");

    // Handle email sending if requested
    let emailResult = null;
    if (statusData.emailData?.send && statusData.emailData.from && statusData.emailData.to) {
      try {
        // Extract domain from email to get SMTP config
        const emailDomain = statusData.emailData.from.split('@')[1];
        let domain = "";
        
        // Map email domain to our domain codes
        const domainMapping: Record<string, string> = {
          "oshaoutreachcourses.com": "OOR",
          "oshaeducationschool.com": "OES",
          "oshaonlinecenter.com": "OOC"
        };
        
        domain = domainMapping[emailDomain] || "OOR";
        
        // console.log("Sending email with domain:", domain);
        // console.log("Email data:", {
        //   to: statusData.emailData.to,
        //   subject: statusData.emailData.subject,
        //   body: statusData.emailData.body,
        //   domain: domain
        // });
        
        // Send email using imported modules
        const smtpConfig = getDomainSMTPConfig(domain);
        
        if (smtpConfig && smtpConfig.user && smtpConfig.password) {
          const transporter = nodemailer.createTransport({
            host: smtpConfig.host,
            port: smtpConfig.port,
            secure: false,
            auth: {
              user: smtpConfig.user,
              pass: smtpConfig.password,
            },
          });

          const mailOptions = {
            from: statusData.emailData.from,
            to: statusData.emailData.to,
            subject: statusData.emailData.subject,
            html: statusData.emailData.body,
          };

          const info = await transporter.sendMail(mailOptions);
          console.log("Email sent successfully:", info.messageId);
          
          // Log email in EmailLog collection
          const emailLog = new EmailLog({
            to: statusData.emailData.to,
            subject: statusData.emailData.subject,
            body: statusData.emailData.body,
            agentId: userId,
            sentAt: new Date()
          });
          const savedEmailLog = await emailLog.save();
          
          // Add email reference to company lead
          await CompanyLead.findByIdAndUpdate(leadId, {
            $push: {
              emails: savedEmailLog._id
            }
          });
          
          emailResult = { 
            success: true, 
            messageId: info.messageId,
            message: "Email sent successfully"
          };
        } else {
          emailResult = { 
            success: false, 
            message: `Email service not configured for ${domain} domain`
          };
        }
        
      } catch (emailError) {
        console.error("Email sending error:", emailError);
        emailResult = { success: false, message: "Failed to send email" };
      }
    }

    return {
      success: true,
      lead: updatedLead,
      emailResult,
      message: "Lead status updated successfully"
    };

  } catch (error) {
    console.error("Update lead status hierarchical error:", error);
    return {
      success: false,
      message: "Error updating lead status"
    };
  }
}
