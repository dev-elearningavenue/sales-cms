import { MongoClient } from "mongodb";

// Import database URIs
const mongoUri_Master = process.env.MONGODB_URI_OOC as string;
const mongoUri_Outreach = process.env.MONGODB_URI_OUTREACH as string;

// Connection options
const CONNECTION_OPTIONS = {
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  maxPoolSize: 50,
  minPoolSize: 10,
  maxIdleTimeMS: 60000,
  retryWrites: true,
  retryReads: true,
  heartbeatFrequencyMS: 10000,
};

// Site database mappings
const SITE_DATABASE_CONFIG = {
  "001": {
    uri: mongoUri_Outreach,
    dbName: "osha-outreach-lms",
    collection: "users",
    siteName: "OSHA OUTREACH COURSES",
  },
  "002": {
    uri: mongoUri_Master,
    dbName: "oshaonlinecenter",
    collection: "users",
    siteName: "OSHA ONLINE CENTER",
  },
  "003": {
    uri: mongoUri_Master,
    dbName: "oes",
    collection: "users",
    siteName: "OSHA EDUCATION SCHOOL",
  },
};

// Legacy mapping for backwards compatibility
const LEGACY_SITE_DATABASE_CONFIG = {
  "OSHA OUTREACH COURSES": {
    uri: mongoUri_Outreach,
    dbName: "osha-outreach-lms",
    collection: "users",
  },
  "OSHA ONLINE CENTER": {
    uri: mongoUri_Master,
    dbName: "oshaonlinecenter",
    collection: "users",
  },
  "OSHA EDUCATION SCHOOL": {
    uri: mongoUri_Master,
    dbName: "oes",
    collection: "users",
  },
};

// Function to generate unique username
async function generateUniqueUserName(
  user: any,
  collection: any
): Promise<string> {
  const baseUserName =
    user.firstName.toLowerCase() +
    "." +
    user.lastName.toLowerCase() +
    Math.floor(Math.random() * 88 + 11);

  const userName = baseUserName.replace(/\s/g, "").replace(/[^a-z0-9.]/g, "");

  // Check if username already exists
  const foundUser = await collection.findOne({ userName });

  if (foundUser === null) {
    return userName;
  } else {
    return await generateUniqueUserName(user, collection);
  }
}

export interface CustomerCheckResponse {
  exists: boolean;
  customer?: {
    fullName?: string;
    email: string;
    contactNo?: string;
  };
  site: string;
}

export interface CreateCustomerRequest {
  site_name: string;
  email: string;
  fullName?: string;
  contactNo?: string;
  send_invoice?: number;
  firstName?: string;
  lastName?: string;
  userName?: string;
  password?: string;
  userType?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  company?: string;
}

export interface CreateCustomerResponse {
  success: boolean;
  customerId?: string;
  message: string;
  customer?: {
    email: string;
    fullName: string;
    contactNo: string;
    site: string;
  };
}

export const createCustomer = async (
  customerData: CreateCustomerRequest
): Promise<CreateCustomerResponse> => {
  try {
    // Validate inputs
    if (!customerData.site_name || !customerData.email) {
      throw new Error("Site name and email are required");
    }

    // Check if this is existing customer (has fullName but no firstName/lastName)
    const isExistingCustomer =
      customerData.fullName &&
      !customerData.firstName &&
      !customerData.lastName;

    if (isExistingCustomer) {
      // EXISTING CUSTOMER: Only call create Customer API, no local DB insertion
      const stripeCustomerData = {
        site_name: customerData.site_name,
        email: customerData.email,
        fullName: customerData.fullName!,
        contactNo: customerData.contactNo || "",
        send_invoice: customerData.send_invoice || 0,
      };
      const response = await stripeCustomerAPI(stripeCustomerData);

      if (!response.success) {
        console.error("Stripe Customer API failed:", response.error);
        throw new Error(`Stripe Customer API error: ${response.error}`);
      }

      // console.log("Stripe Create Customer API success, customerId:", response);

      return {
        success: true,
        customerId: response.customerId,
        message: "Customer created on stripe successfully",
        customer: {
          email: customerData.email,
          fullName: customerData.fullName!,
          contactNo: customerData.contactNo || "",
          site: customerData.site_name,
        },
      };
    } else {
      if (!customerData.firstName || !customerData.lastName) {
        throw new Error(
          "First name and last name are required for new customers"
        );
      }

      const fullName =
        `${customerData.firstName} ${customerData.lastName}`.trim();

      // Call Stripe API first to get proper customerId
      const stripeCustomerData = {
        site_name: customerData.site_name,
        email: customerData.email,
        fullName: fullName,
        contactNo: customerData.contactNo || "",
        send_invoice: customerData.send_invoice || 0,
      };
      const stripeApiResponse = await stripeCustomerAPI(stripeCustomerData);

      if (!stripeApiResponse.success) {
        console.error("External API failed:", stripeApiResponse.error);
        throw new Error(`External API error: ${stripeApiResponse.error}`);
      }
      // Get database configuration for the site
      const siteConfig =
        SITE_DATABASE_CONFIG[
          customerData.site_name as keyof typeof SITE_DATABASE_CONFIG
        ];

      if (!siteConfig) {
        throw new Error(
          `Configuration not found for site code: ${customerData.site_name}`
        );
      }

      const client = new MongoClient(siteConfig.uri, CONNECTION_OPTIONS);
      try {
        // Connect to the database
        await client.connect();

        // Get the database and collection
        const db = client.db(siteConfig.dbName);
        const collection = db.collection(siteConfig.collection);

        // Generate unique username
        const uniqueUserName = await generateUniqueUserName(
          {
            firstName: customerData.firstName,
            lastName: customerData.lastName,
          },
          collection
        );

        const now = new Date();
        // Prepare customer document with all default fields matching the original schema
        const customerDocument = {
          email: customerData.email.toLowerCase(),
          firstName: customerData.firstName,
          lastName: customerData.lastName,
          userName: uniqueUserName,
          password: customerData.password || "Apple@123!",
          contactNo: customerData.contactNo || "",
          address: customerData.address || "-",
          city: customerData.city || "-",
          state: customerData.state || "-",
          country: customerData.country || "-",
          zipCode: customerData.zipCode || "-",
          company: customerData.company || "-",
          userType: customerData.userType === "manager" ? 2 : 4,
          createdAt: now,
          updatedAt: now,
        };

        // Insert the customer
        const result = await collection.insertOne(customerDocument);

        if (result.insertedId) {
          return {
            success: true,
            customerId: stripeApiResponse.customerId, // Return external API customerId
            message: "Customer created successfully",
            customer: {
              email: customerData.email,
              fullName: fullName,
              contactNo: customerData.contactNo || "",
              site: siteConfig.siteName,
            },
          };
        } else {
          throw new Error("Failed to insert customer document");
        }
      } finally {
        // Always close the connection
        await client.close();
      }
    }
  } catch (error: any) {
    console.error(`Error creating customer:`, {
      message: error.message,
      customerData: {
        ...customerData,
        contactNo: customerData.contactNo ? "***masked***" : "",
        password: "***masked***",
      },
    });

    return {
      success: false,
      message: `Failed to create customer: ${error.message}`,
    };
  }
};

// Function to handle existing customer with external API call
export const processExistingCustomer = async (
  customerData: CreateCustomerRequest & { fullName: string }
): Promise<CreateCustomerResponse> => {
  try {
    // Call external API to get proper customerId for existing customer
    const externalApiData = {
      site_name: customerData.site_name,
      email: customerData.email,
      fullName: customerData.fullName,
      contactNo: customerData.contactNo || "",
      send_invoice: customerData.send_invoice || 0,
    };

    console.log("Calling stripe API for existing customer:", externalApiData);
    const externalResult = await stripeCustomerAPI(externalApiData);

    if (!externalResult.success) {
      console.error("Stripe API failed:", externalResult.error);
      throw new Error(`Stripe API error: ${externalResult.error}`);
    }

    console.log("Stripe API success, customerId:", externalResult.customerId);

    return {
      success: true,
      customerId: externalResult.customerId, // Return external API customerId
      message: "Existing customer processed successfully",
      customer: {
        email: customerData.email,
        fullName: customerData.fullName,
        contactNo: customerData.contactNo || "",
        site: customerData.site_name,
      },
    };
  } catch (error: any) {
    console.error("Error processing existing customer:", error);
    return {
      success: false,
      message: `Failed to process existing customer: ${error.message}`,
    };
  }
};

// Checked
export const checkCustomerExists = async (
  email: string,
  siteName: string
): Promise<CustomerCheckResponse> => {
  try {
    if (!email || !siteName) {
      throw new Error("Email and site name are required");
    }
    const siteConfig =
      LEGACY_SITE_DATABASE_CONFIG[
        siteName as keyof typeof LEGACY_SITE_DATABASE_CONFIG
      ];

    if (!siteConfig) {
      throw new Error(`Configuration not found for site: ${siteName}`);
    }
    const client = new MongoClient(siteConfig.uri, CONNECTION_OPTIONS);

    try {
      await client.connect();

      const db = client.db(siteConfig.dbName);
      const collection = db.collection(siteConfig.collection);

      // Search for user by email
      const user = await collection.findOne(
        { email: email.toLowerCase(), userType: { $in: [2, 4] } },
        {
          projection: {
            _id: 1,
            email: 1,
            firstName: 1,
            lastName: 1,
            contactNo: 1,
          },
        }
      );

      if (user) {
        let fullName = "";

        if (user.firstName && user.lastName) {
          fullName = `${user.firstName} ${user.lastName}`;
        }
        const contactNo = user.contactNo || "";

        return {
          exists: true,
          customer: {
            fullName: fullName.trim(),
            contactNo: contactNo,
            email: user.email,
          },
          site: siteName,
        };
      } else {
        return {
          exists: false,
          site: siteName,
        };
      }
    } finally {
      await client.close();
    }
  } catch (error: any) {
    console.error(`Error checking customer in ${siteName}:`, {
      message: error.message,
      email: email,
      site: siteName,
    });

    throw new Error(`Failed to check customer: ${error.message}`);
  }
};

// Function to call external customer creation API
async function stripeCustomerAPI(customerData: {
  site_name: string;
  email: string;
  fullName: string;
  contactNo: string;
  send_invoice: number;
}): Promise<{ success: boolean; customerId?: string; error?: string }> {
  try {
    // console.log("Calling stripe customer API with data:", customerData);

    const response = await fetch(
      "https://freeoshacourses.com/api/api_create_customer.php",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(customerData),
      }
    );

    const result = await response.json();
    // console.log("Stripe customer API response:", result);

    if (response.ok && result.status) {
      return {
        success: true,
        customerId: result.data.customerId,
      };
    } else {
      console.error("Stripe customer API error:", result);
      return {
        success: false,
        error: result.message || "Stripe API error",
      };
    }
  } catch (error: any) {
    console.error("Error calling stripe customer API:", error);
    return {
      success: false,
      error: error.message || "Network error",
    };
  }
}
