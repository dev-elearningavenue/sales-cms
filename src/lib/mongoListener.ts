import {
  MongoClient,
  ObjectId,
  Collection,
  ChangeStream,
  ReadPreference,
} from "mongodb";
import Log from "@/models/log";
import Lead from "@/models/lead";
import { createNewLeadNotification } from "@/services/notificationService";

const mongoUri_Master = process.env.MONGODB_URI_OOC as string;
const mongoUri_Outreach = process.env.MONGODB_URI_OUTREACH as string;

// Connection options with better timeout and retry settings
const CONNECTION_OPTIONS = {
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 45000,
  maxPoolSize: 50,
  minPoolSize: 10,
  maxIdleTimeMS: 60000,
  retryWrites: true,
  retryReads: true,
  heartbeatFrequencyMS: 10000, // Keep connection alive with heartbeats
  w: "majority" as const, // Write concern for better consistency
  readPreference: ReadPreference.SECONDARY_PREFERRED, // Read from secondary nodes when possible
};

let master_client: MongoClient | null = null;
let outreach_client: MongoClient | null = null;

let activeChangeStreams: ChangeStream[] = [];
let isListenerActive = false;
let initializationCount = 0;
const pendingOrders = new Map();

// Add reconnection logic
async function ensureConnection(
  client: MongoClient | null,
  uri: string,
  name: string
): Promise<MongoClient> {
  try {
    if (!client) {
      client = new MongoClient(uri, CONNECTION_OPTIONS);
      await client.connect();
      console.log(`${name} connection established successfully`);
    } else {
      // Test if the connection is alive
      try {
        await client.db("admin").command({ ping: 1 });
      } catch (err) {
        console.log(`${name} connection lost, reconnecting...`);
        try {
          await client.close(true);
        } catch (closeErr) {
          console.error(`Error closing existing ${name} client:`, closeErr);
        }
        client = new MongoClient(uri, CONNECTION_OPTIONS);
        await client.connect();
      }
    }
    return client;
  } catch (error: any) {
    console.error(`Error ensuring ${name} connection:`, error.message);
    throw error;
  }
}

export async function watchCollections() {
  initializationCount++;
  console.log(`Initialization attempt #${initializationCount}`);

  if (isListenerActive) {
    console.log("Change Stream is already running!");
    return;
  }

  // Clean up any existing connections before starting
  await stopWatching();
  console.log("Active Streams: ", activeChangeStreams.length);

  let retryCount = 0;
  const maxRetries = 5;

  while (retryCount < maxRetries) {
    try {
      // Establish connections with retry logic
      master_client = await ensureConnection(
        master_client,
        mongoUri_Master,
        "Master"
      );
      outreach_client = await ensureConnection(
        outreach_client,
        mongoUri_Outreach,
        "Outreach"
      );

      isListenerActive = true;

      const leads_db = master_client.db("lead-management");
      const oes_db = master_client.db("oes");
      const ooc_db = master_client.db("oshaonlinecenter");
      const oor_db = outreach_client.db("osha-outreach-lms");

      // Target Collections
      const customersCollection = leads_db.collection("customers");
      const contactUsCollection = leads_db.collection("contacts");
      const abandonedCartsCollection = leads_db.collection("abandonedcarts");
      const ordersCollection = leads_db.collection("paidorders");
      const scholarshipCollection = leads_db.collection("scholarships");
      // const logsCollection = leads_db.collection("logs");
      // const leadsCollection = leads_db.collection("leads");

      // Define Source collections for users and orders
      const userCollections = [
        {
          collection: ooc_db.collection("users"),
          domain: "Osha Online Center - OOC",
        },
        {
          collection: oes_db.collection("users"),
          domain: "Osha Education School - OES",
        },
        {
          collection: oor_db.collection("users"),
          domain: "Osha Outreach - OOR",
        },
      ];

      userCollections.forEach(({ collection, domain }) => {
        setupUserCollectionWatch(collection, domain, customersCollection);
      });

      const contactUsCollections = [
        {
          collection: ooc_db.collection("contacts"),
          domain: "Osha Online Center - OOC",
        },
        {
          collection: oes_db.collection("contacts"),
          domain: "Osha Education School - OES",
        },
        {
          collection: oor_db.collection("contacts"),
          domain: "Osha Outreach - OOR",
        },
      ];

      contactUsCollections.forEach(({ collection, domain }) => {
        setupContactUsCollectionWatch(collection, domain, contactUsCollection);
      });

      const cartCollections = [
        {
          collection: ooc_db.collection("orders"),
          domain: "Osha Online Center - OOC",
        },
        {
          collection: oes_db.collection("orders"),
          domain: "Osha Education School - OES",
        },
        {
          collection: oor_db.collection("orders"),
          domain: "Osha Outreach - OOR",
        },
      ];

      cartCollections.forEach(({ collection, domain }) => {
        setupOrderCollectionWatch(
          collection,
          domain,
          abandonedCartsCollection,
          ordersCollection
        );
      });

      setupScholarshipCollectionWatch(
        oor_db.collection("scholarships"),
        "Osha Outreach - OOR",
        scholarshipCollection
      );

      setupConnectionMonitoring();
      break;
    } catch (error: any) {
      retryCount++;
      console.error(`Connection attempt ${retryCount} failed:`, {
        message: error.message,
        name: error.name,
        code: error.code,
      });

      if (
        error.name === "MongoNetworkError" ||
        error.name === "MongoServerSelectionError"
      ) {
        const backoffTime = Math.min(1000 * Math.pow(2, retryCount), 30000);
        console.log(`Retrying in ${backoffTime / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, backoffTime));
        continue;
      }

      await stopWatching();
      throw error;
    }
  }

  if (retryCount === maxRetries) {
    console.error("Failed to establish connection after maximum retries");
    setTimeout(() => watchCollections(), 60000); // Try again in 1 minute
  }
}

function setupScholarshipCollectionWatch(
  sourceDbCollection: Collection,
  domain: string,
  scholarshipCollection: Collection
) {
  const changeStream = sourceDbCollection.watch();
  activeChangeStreams.push(changeStream);

  changeStream.on("change", async (change) => {
    try {
      // console.log(
      //   `Change event in Scholarship's collection of ${
      //     domain.split(" - ")[1]
      //   }:`,
      //   change
      // );
      if (change.operationType === "insert") {
        const newUser = change.fullDocument;
        const type = "Scholarship";
        await syncToTargetCollection(
          newUser,
          `${domain}`,
          scholarshipCollection,
          type
        );
      }
    } catch (error) {
      console.error(
        `Error processing change in ${domain} scholarship watch:`,
        error
      );
    }
  });

  changeStream.on("error", (err: any) => {
    console.error(
      `Change Stream Error in ${domain} scholarship watch, triggering restart:`,
      err.message
    );
    restartWatchers().catch((restartErr) => {
      console.error("Failed to trigger watcher restart:", restartErr);
    });
  });

  // console.log(
  //   `${domain.split(" - ")[1]} Scholarship collection: ${
  //     activeChangeStreams.length
  //   }`
  // );
  return changeStream;
}

function setupUserCollectionWatch(
  sourceDbCollection: Collection,
  domain: string,
  customersCollection: Collection
) {
  const changeStream = sourceDbCollection.watch();
  activeChangeStreams.push(changeStream);

  changeStream.on("change", async (change) => {
    try {
      // console.log(
      //   `Change event in User's collection of ${domain.split(" - ")[1]}:`,
      //   change
      // );
      if (change.operationType === "insert") {
        const newUser = change.fullDocument;

        if (newUser?.freeSignUp === true) {
          const type = "Free SignUp";
          await syncToTargetCollection(
            newUser,
            `${domain}`,
            customersCollection,
            type
          );
        } else {
          console.log(
            `Skipping ${
              domain.split(" - ")[1]
            } user, because of non free_signup`
          );
        }
      }
    } catch (error) {
      console.error(`Error processing change in ${domain} user watch:`, error);
    }
  });

  changeStream.on("error", (err: any) => {
    console.error(
      `Change Stream Error in ${domain} user watch, triggering restart:`,
      err.message
    );
    restartWatchers().catch((restartErr) => {
      console.error("Failed to trigger watcher restart:", restartErr);
    });
  });

  // console.log(
  //   `${domain.split(" - ")[1]} users collection ${activeChangeStreams.length}`
  // );
  return changeStream;
}

function setupContactUsCollectionWatch(
  sourceDbCollection: Collection,
  domain: string,
  ContactUsCollection: Collection
) {
  const changeStream = sourceDbCollection.watch();
  activeChangeStreams.push(changeStream);

  changeStream.on("change", async (change) => {
    try {
      // console.log(
      //   `Change event in Contact us collection of ${domain.split(" - ")[1]}:`,
      //   change
      // );
      if (change.operationType === "insert") {
        const newContact = change.fullDocument;
        const type = "Contact Us";
        await syncToTargetCollection(
          newContact,
          `${domain}`,
          ContactUsCollection,
          type
        );
      }
    } catch (error) {
      console.error(
        `Error processing change in ${domain} contact watch:`,
        error
      );
    }
  });

  changeStream.on("error", (err: any) => {
    console.error(
      `Change Stream Error in ${domain} contact watch, triggering restart:`,
      err.message
    );
    restartWatchers().catch((restartErr) => {
      console.error("Failed to trigger watcher restart:", restartErr);
    });
  });
  // console.log(
  //   `${domain.split(" - ")[1]} users collection ${activeChangeStreams.length}`
  // );
  return changeStream;
}

function setupOrderCollectionWatch(
  collection: Collection,
  domain: string,
  abandonedCartsCollection: Collection,
  ordersCollection: Collection
) {
  const changeStream = collection.watch();
  activeChangeStreams.push(changeStream);

  changeStream.on("change", async (change) => {
    try {
      if (change.operationType === "insert") {
        const newOrder = change.fullDocument;

        if (newOrder?.isPaid === false) {
          // Store the order ID in a temporary map with a timestamp
          const orderId = newOrder._id.toString();
          pendingOrders.set(orderId, {
            timestamp: Date.now(),
            processed: false,
          });

          setTimeout(() => {
            (async () => {
              try {
                const pendingInfo = pendingOrders.get(orderId);
                if (!pendingInfo || pendingInfo.processed) return;

                // Check if order is still unpaid after delay
                const orderStatus = await collection.findOne({
                  _id: newOrder._id,
                });

                if (!orderStatus || orderStatus.isPaid === true) {
                  pendingOrders.delete(orderId);
                  return;
                }
                // avoid double processing
                pendingInfo.processed = true;

                await syncToTargetCollection(
                  newOrder,
                  `${domain} (Unpaid)`,
                  abandonedCartsCollection,
                  "Abandoned Cart"
                );
                // console.log(
                //   `Unpaid Order on ${
                //     domain.split(" - ")[1]
                //   } successfully processed: ${newOrder._id}`
                // );

                if (orderStatus?.isPaid === false) {
                  // Use the same client for all operations
                }
              } catch (error) {
                console.error("Error processing abandoned cart:", error);
                pendingOrders.delete(orderId);
              }
            })();
          }, 6 * 60 * 1000);
        }
      } else if (change.operationType === "update") {
        const updatedOrder = await collection.findOne({
          _id: change.documentKey._id,
        });

        const orderId = change.documentKey._id.toString();
        const isPaidNow = updatedOrder?.isPaid;
        const wasPaidBefore =
          change.updateDescription?.updatedFields?.isPaid !== undefined
            ? !change.updateDescription.updatedFields.isPaid
            : updatedOrder?.isPaid;

        if (wasPaidBefore === false && isPaidNow === true) {
          console.log(
            `Order is now paid on ${domain.split(" - ")[1]}:`,
            orderId
          );
          pendingOrders.delete(orderId);

          const cartDeleted = await abandonedCartsCollection.deleteOne({
            originId: new ObjectId(orderId),
          });

          if (cartDeleted.deletedCount > 0) {
            console.log(
              `Removed abandoned cart for order ${orderId} that was subsequently paid`
            );

            // Optionally, clean up the associated logs and leads
            // This can be done by finding and deleting them
            // Or you can add a flag in the schema that marks them as "converted"

            await Log.findOneAndUpdate(
              { syncedId: new ObjectId(orderId) },
              {
                $set: {
                  synced: "unpaid to paid & discarded abandoned cart",
                },
              }
            );

            await Lead.findOneAndUpdate(
              { abandoned_cart: new ObjectId(orderId) },
              {
                $set: {
                  status: "Paid",
                  resolve_status: "Paid",
                  abandoned_cart: null,
                  assigned: null,
                },
              }
            );
          }

          try {
            // Create new paid order entry
            const orderResult = await syncToTargetCollection(
              updatedOrder,
              `${domain} (Paid)`,
              ordersCollection,
              "Order Creation"
            );
            // console.log(
            //   `Successfully processed paid order ${updatedOrder._id}`
            // );

            // If we have the order result, update the lead with the new order reference
            if (orderResult?.insertedId) {
              await Lead.findOneAndUpdate(
                { abandoned_cart: new ObjectId(orderId) },
                {
                  $set: {
                    order_creation: orderResult.insertedId,
                    category: "Order Creation",
                  },
                }
              );
            }
          } catch (error) {
            console.error("Error processing paid order:", error);
          }
        }
      }
    } catch (error) {
      console.error(`Error processing change in ${domain} order watch:`, error);
    }
  });

  changeStream.on("error", (err: any) => {
    console.error(
      `Change Stream Error in ${domain} orders watch, triggering restart:`,
      err.message
    );
    restartWatchers().catch((restartErr) => {
      console.error("Failed to trigger watcher restart:", restartErr);
    });
  });

  // console.log(
  //   `${domain.split(" - ")[1]} orders collection: ${activeChangeStreams.length}`
  // );
  return changeStream;
}

async function syncToTargetCollection(
  document: any,
  domain: string,
  targetCollection: Collection,
  type: string,
  session?: any
) {
  // console.log(`${type} on ${domain.split(" - ")[1]}`);

  const exists = await targetCollection.findOne({
    originId: new ObjectId(document._id.toString()),
  });

  if (exists) {
    // console.log(
    //   `Skipping duplicate entry from ${domain.split(" - ")[1]}`,
    //   document._id
    // );
    return null;
  }

  try {
    const syncedData = {
      ...document,
      originId: document._id,
      domain,
      syncedAt: new Date(),
    };
    delete syncedData._id;

    const insertResult = await targetCollection.insertOne(syncedData);
    // console.log("inserted Result", insertResult);
    if (!insertResult || !insertResult.insertedId)
      throw new Error(`Failed to insert into ${targetCollection}`);

    // console.log(
    //   `Successfully inserted into ${type} collection: ${insertResult.insertedId}`
    // );

    const logData = new Log({
      sourceDbId: new ObjectId(document._id.toString()),
      syncedId: insertResult.insertedId,
      sourceDomain: domain,
      description: `Log created of ${type} from ${domain.split(" - ")[1]}`,
      synced: "success",
    });

    // Use the MongoDB session with Mongoose save
    const logResult = await logData.save();

    if (!logResult) throw new Error("Failed to insert into Logs.");

    const { category, leadFields, formattedDomain } = getLeadDetails(
      type,
      insertResult.insertedId,
      domain
    );
    const leadData = new Lead({
      category: category,
      ...leadFields,
      domain: formattedDomain,
      status: "Pending",
      resolve_status: "Pending",
      assigned: false,
      createdAt: new Date(),
      next_follow_up: null,
      notes: [],
      conversion_value: null,
    });

    const leadResult = await leadData.save();
    // console.log(`Lead created with ID: ${leadResult._id}`);
    createNewLeadNotification(leadResult);

    return insertResult;
  } catch (error: any) {
    console.error(`Error syncing data from ${domain}:`, error);
    throw error;
  }
}

export function getLeadDetails(
  type: string,
  insertedId: ObjectId,
  domain: string
) {
  const getRandomCategory = () => {
    return Math.random() < 0.5 ? "Free SignUp" : "Free Study Guide";
  };

  let category: string = "";
  switch (type) {
    case "Free SignUp":
      category = getRandomCategory();
      break;
    case "Abandoned Cart":
    case "Order Creation":
    case "Contact Us":
    case "Scholarship":
    case "Unpaid Training":
    case "SC Group Discount":
      category = type;
      break;
    default:
      category = "Unknown";
  }

  const leadFields = {
    free_signup: type === "Free SignUp" ? insertedId : null,
    contact_us: type === "Contact Us" ? insertedId : null,
    scholarship: type === "Scholarship" ? insertedId : null,
    abandoned_cart: type === "Abandoned Cart" ? insertedId : null,
    shortcourse_discount: type === "SC Group Discount" ? insertedId : null,
    custom_lead: type === "Custom Lead" ? insertedId : null,
    order_creation:
      type === "Order Creation" || type === "Unpaid Training"
        ? insertedId
        : null,
  };

  const formattedDomain =
    type === "Order Creation" || type === "Abandoned Cart"
      ? domain.split(" - ")[1].split(" ")[0]
      : domain.split(" - ")[1];

  return { category, leadFields, formattedDomain };
}

// Improve connection monitoring
function setupConnectionMonitoring() {
  const CHECK_INTERVAL = 20 * 60 * 1000; // Check every 20 minutes
  const HEALTH_CHECK_TIMEOUT = 20 * 60000; // 20 min timeout for health checks

  setInterval(async () => {
    try {
      if (!master_client || !outreach_client) {
        console.warn(
          "One or both clients are null, initiating reconnection..."
        );
        await restartWatchers();
        return;
      }

      const healthChecks = await Promise.all([
        Promise.race([
          master_client.db("admin").command({ ping: 1 }),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Master health check timeout")),
              HEALTH_CHECK_TIMEOUT
            )
          ),
        ]).catch(() => null),
        Promise.race([
          outreach_client.db("admin").command({ ping: 1 }),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("Outreach health check timeout")),
              HEALTH_CHECK_TIMEOUT
            )
          ),
        ]).catch(() => null),
      ]);

      if (!healthChecks[0] || !healthChecks[1]) {
        console.warn("Health check failed, restarting watchers...");
        await restartWatchers();
      }
      // else {
      //   console.log(
      //     `Health check passed: ${activeChangeStreams.length} active streams`
      //   );
      // }
    } catch (error) {
      console.error("Health check failed with error:", error);
      await restartWatchers();
    }
  }, CHECK_INTERVAL);
}

async function restartWatchers() {
  if (!isListenerActive) return;
  console.log("Initiating watcher restart sequence...");
  await stopWatching();

  // Add exponential backoff for restart
  const backoffTime = Math.min(1000 * Math.pow(2, initializationCount), 30000);
  console.log(`Restarting watchers in ${backoffTime / 1000} seconds...`);

  setTimeout(() => {
    watchCollections().catch((err) => {
      console.error("Error during watcher restart:", err);
    });
  }, backoffTime);
}

// Function to stop all active change streams
export async function stopWatching() {
  isListenerActive = false;
  // console.log(`Closing ${activeChangeStreams.length} active streams...`);

  try {
    await Promise.all(
      activeChangeStreams.map((stream) =>
        stream.close().catch((e) => console.error("Error closing stream:", e))
      )
    );
  } catch (err) {
    console.error("Error during batch-closing of change streams: ", err);
  }

  activeChangeStreams = [];

  if (master_client) {
    try {
      await master_client.close();
      master_client = null;
    } catch (err) {
      console.error("Error closing master client:", err);
    }
  }

  if (outreach_client) {
    try {
      await outreach_client.close();
      outreach_client = null;
    } catch (err) {
      console.error("Error closing outreach client:", err);
    }
  }
  console.log("All resources cleaned up ... ");
}
