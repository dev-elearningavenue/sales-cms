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
export async function uploadCSVData(file: File, state?: string) {
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
        const lead: any = { source: state || file.name };

        const fieldMap: Record<string, string> = {
          "company name": "companyName",
          "company": "companyName",
          "company email": "companyEmail",
          "email": "companyEmail",
          "phone number": "phoneNumber",
          "phone": "phoneNumber",
          "contact": "phoneNumber",
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
          "contact person title": "contactPersonName",
          "title": "contactPersonName",
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
export async function getTimezoneBasedLead() {
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
    const businessHoursStart = 5; // 9:30 AM
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
            
            // Update last contacted timestamp
            await CompanyLead.findByIdAndUpdate(lead._id, {
              lastContacted: new Date(),
              updatedAt: new Date()
            });
            
            return {
              success: true,
              lead: lead,
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
export async function updateLeadWithFollowUp(leadId: string, updates: any) {
  try {
    const lead = await CompanyLead.findById(leadId);
    if (!lead) {
      return { success: false, message: "Lead not found" };
    }
    
    const updateData: any = {
      ...updates,
      updatedAt: new Date()
    };
    
    // Handle status change
    if (updates.status) {
      updateData.lastStatusChange = new Date();
    }
    
    // Handle follow-up addition
    if (updates.newFollowUp) {
      const followUp = {
        date: new Date(),
        contact_type: updates.newFollowUp.contact_type,
        notes: updates.newFollowUp.notes,
        status: updates.newFollowUp.status || "scheduled"
      };
      
      updateData.$push = {
        nextFollowUp: followUp,
        contactHistory: {
          date: new Date(),
          type: updates.newFollowUp.contact_type,
          notes: updates.newFollowUp.notes,
          status: updates.status || lead.status
        }
      };
      
      updateData.lastContacted = new Date();
    }
    
    // Handle contact info update
    if (updates.contactInfo) {
      updateData.contactPerson = updates.contactInfo.contactPerson;
      updateData.contactPersonName = updates.contactInfo.contactPersonName;
      updateData.phoneNumber = updates.contactInfo.phoneNumber;
      updateData.companyEmail = updates.contactInfo.companyEmail;
    }
    
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
