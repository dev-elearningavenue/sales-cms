import { MongoClient, ObjectId } from "mongodb";

const mongoUri_Master = process.env.MONGODB_URI_OOC as string;
const mongoUri_Outreach = process.env.MONGODB_URI_OUTREACH as string;

const CONNECTION_OPTIONS = {
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  maxPoolSize: 50,
  minPoolSize: 5,
  maxIdleTimeMS: 60000,
  retryWrites: true,
  retryReads: true,
};

// Map domain codes used in leads to the respective DB
const DOMAIN_DB_CONFIG: Record<string, { uri: string; dbName: string; collection: string }> = {
  OOR: { uri: mongoUri_Outreach, dbName: "osha-outreach-lms", collection: "users" },
  OOC: { uri: mongoUri_Master, dbName: "oshaonlinecenter", collection: "users" },
  OES: { uri: mongoUri_Master, dbName: "oes", collection: "users" },
};

export interface ExternalUser {
  _id: string;
  userName?: string;
  full_name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export const findExternalUserById = async (
  userId: string,
  domainCode: string
): Promise<{ success: boolean; user?: ExternalUser; message?: string }> => {
  try {
    const cfg = DOMAIN_DB_CONFIG[domainCode];
    if (!cfg) {
      return { success: false, message: `Unknown domain code: ${domainCode}` };
    }
    if (!userId || !ObjectId.isValid(userId)) {
      return { success: false, message: "Invalid user id" };
    }

    const client = new MongoClient(cfg.uri, CONNECTION_OPTIONS);
    try {
      await client.connect();
      const db = client.db(cfg.dbName);
      const collection = db.collection(cfg.collection);

      const doc = await collection.findOne(
        { _id: new ObjectId(userId) },
        { projection: { userName: 1, full_name: 1, firstName: 1, lastName: 1, email: 1 } }
      );

      if (!doc) {
        return { success: false, message: "User not found" };
      }
    //   console.log("Result from external DB: ", doc);
      const user: ExternalUser = {
        _id: (doc._id as ObjectId).toHexString(),
        userName: doc.userName,
        full_name: doc.full_name,
        firstName: doc.firstName,
        lastName: doc.lastName,
        email: doc.email,
      };
      return { success: true, user };
    } finally {
      await client.close();
    }
  } catch (err: any) {
    console.error("findExternalUserById error:", err);
    return { success: false, message: err.message || "Unexpected error" };
  }
};


