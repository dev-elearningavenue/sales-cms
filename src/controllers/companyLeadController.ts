import CompanyLead from "@/models/companyLead";
import { getStateName } from "@/utils/stateMapping";
import * as XLSX from 'xlsx';

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
          "company website": "companyWebsite",
          "website": "companyWebsite",
        };

        // Prefer body state if provided
        if (state) {
          const normalizedBodyState = getStateName(String(state));
          if (normalizedBodyState) lead.state = normalizedBodyState;
        }

        if (userId) lead.uploadedBy = userId as any;
        if (userAssignedDomain) lead.domain = userAssignedDomain;

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
    const businessHoursStart = 0; // 9:30 AM
    const businessHoursEnd = 17; // 5:00 PM
    
    // Check each state systematically
    for (const [stateName, timezone] of Object.entries(stateTimezones)) {
      try {
        const stateTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
        const stateHour = stateTime.getHours() + stateTime.getMinutes() / 60;
        
        // Check if state is in business hours
        if (stateHour >= businessHoursStart && stateHour <= businessHoursEnd) {
          console.log(`Checking ${stateName} (${timezone}) - Current time: ${stateHour.toFixed(2)}`);
          
          // Find available lead in this state
          const lead = await CompanyLead.findOne({
            state: stateName,
            status: { $in: ["new", "pending", "follow_up"] },
            $or: [
              { lastContacted: { $exists: false } },
              { lastContacted: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } // Not contacted in last 24 hours
            ]
          }).sort({ createdAt: 1 }); // Oldest first
          
          if (lead) {
            console.log(`Found lead in ${stateName}: ${lead.companyName}`);
            
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
            
            const updatedLead = await CompanyLead.findByIdAndUpdate(lead._id, updateData, { new: true });
            
            return {
              success: true,
              lead: updatedLead,
              message: `Found lead in ${stateName}`
            };
          }
        }
      } catch (error) {
        console.error(`Error checking ${stateName}:`, error);
        continue; // Continue with next state
      }
    }
    
    // If no lead found in any business hours state
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

    console.log("Updates: ", updates)
    
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
    
    // Handle follow-up addition (supports both new comprehensive format and old simple format)
    console.log("=== Follow-up Check ===");
    console.log("updates.newFollowUp:", updates.newFollowUp);
    console.log("updates.nextFollowUp:", updates.nextFollowUp);
    console.log("updates.contactTypes:", updates.contactTypes);
    console.log("updates.notes:", updates.notes);
    
    if (updates.newFollowUp) {
      console.log("Using newFollowUp format");
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
    console.log("=== updateCompanyLead ===");
    console.log("Lead ID:", id);
    console.log("New Data:", JSON.stringify(newData, null, 2));
    
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

    // Handle follow-up addition for modal submissions
    console.log("=== updateCompanyLead Follow-up Check ===");
    console.log("newData.nextFollowUp:", newData.nextFollowUp);
    console.log("newData.contactTypes:", newData.contactTypes);
    console.log("newData.notes:", newData.notes);
    
    // Handle follow-up separately with $push operation
    let pushOperations = null;
    if (newData.nextFollowUp && newData.contactTypes && Array.isArray(newData.contactTypes) && newData.contactTypes.length > 0) {
      console.log("Adding follow-up entry from modal");
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
      
      console.log("Created followUp in updateCompanyLead:", followUp);
      
      // Don't include these in direct field update
      delete mergedData.nextFollowUp;
      delete mergedData.contactTypes;
    }

    // NOTE: "Save All Changes" sirf fields update karta hai, contact history nahi banata
    // Contact history sirf follow-up, email sending, resolve waghaira se banta hai

    console.log("Old Lead Socials:", oldLeadObj.socials);
    console.log("New Data Socials:", newData.socials);
    console.log("Merged Data Socials:", mergedData.socials);
    console.log("Final Merged Data:", JSON.stringify(mergedData, null, 2));
    console.log("Push Operations:", pushOperations);

    // 4. Update with merged data - separate regular updates from $push operations
    let updated;
    
    if (pushOperations) {
      // If we have follow-up data, do a separate $push operation first
      console.log("Performing $push operation for follow-up");
      await CompanyLead.findByIdAndUpdate(id, { $push: pushOperations });
      
      // Then do the regular field update
      console.log("Performing regular field update");
      updated = await CompanyLead.findByIdAndUpdate(id, mergedData, {
        new: true,
        runValidators: true
      });
    } else {
      // No push operations, just regular update
      console.log("Performing regular update only");
      updated = await CompanyLead.findByIdAndUpdate(id, mergedData, {
        new: true,
        runValidators: true
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
