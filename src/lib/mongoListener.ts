import { MongoClient, ObjectId, Collection, ChangeStream } from "mongodb";
import mongoose from "mongoose";
import Log from "@/models/log";
import Lead from "@/models/lead";

console.log("mongoListener.ts loaded");
const mongoUri_Master = process.env.CLUSTER_MASTER as string;
const mongoUri_Outreach = process.env.CLUSTER_OUTREACH as string;

let master_client: MongoClient | null = null;
let outreach_client: MongoClient | null = null;

let activeChangeStreams: ChangeStream[] = [];
let isListenerActive = false;
let initializationCount = 0;
const pendingOrders = new Map();

export async function watchCollections() {
  initializationCount++;
  console.log(`Initialization attempt #${initializationCount}`);

  if (isListenerActive) {
    console.log("Change Stream is already running!", isListenerActive);
    return;
  }

  // Clean up any existing connections before starting
  await stopWatching();
  console.log("Active Streams: ", activeChangeStreams.length);

  try {
    master_client = new MongoClient(mongoUri_Master, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    outreach_client = new MongoClient(mongoUri_Outreach, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });

    await master_client.connect();
    await outreach_client.connect();

    isListenerActive = true;
    console.log("Connected to MongoDB clusters");

    const leads_db = master_client.db("lead-management");
    const oes_db = master_client.db("oes");
    const ooc_db = master_client.db("oshaonlinecenter");
    const oor_db = outreach_client.db("osha-outreach-lms");

    // Target Collections
    const customersCollection = leads_db.collection("customers");
    const contactUsCollection = leads_db.collection("contacts");
    const abandonedCartsCollection = leads_db.collection("abandonedcarts");
    const ordersCollection = leads_db.collection("paidorders");
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
      { collection: oor_db.collection("users"), domain: "Osha Outreach - OOR" },
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

    // You could add more specialized watchers here for contact forms, scholarship etc.

    setupConnectionMonitoring();
    console.log("watchCollection function is running");
  } catch (error: any) {
    console.error("Error in Change Stream:", error);
    await stopWatching();
    if (error.name === "MongoNetworkError") {
      console.error("Network error details:", {
        message: error.message,
        cause: error.cause,
        stack: error.stack,
      });

      if (error.message.includes("connection")) {
        console.error("This appears to be a connection issue");
      } else if (error.message.includes("timeout")) {
        console.error("This appears to be a timeout issue");
      }
    }

    setTimeout(() => watchCollections(), 10000);
  }
}

function setupUserCollectionWatch(
  sourceDbCollection: Collection,
  domain: string,
  customersCollection: Collection
) {
  const changeStream = sourceDbCollection.watch();
  activeChangeStreams.push(changeStream);

  console.log("Active Streams: ", activeChangeStreams.length);
  changeStream.on("change", async (change) => {
    console.log(
      `Change event in User's collection of ${domain.split(" - ")[1]}:`,
      change
    );
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
          `Skipping ${domain.split(" - ")[1]} user, because of non free_signup`,
          newUser
        );
      }
    }
  });

  changeStream.on("error", (err) => {
    console.error(
      `Change Stream Error in ${domain.split(" - ")[1]}:`,
      err.message
    );
    // Remove this stream from activeChangeStreams
    const index = activeChangeStreams.indexOf(changeStream);
    if (index !== -1) {
      activeChangeStreams.splice(index, 1); // Remove from array
    }
    changeStream
      .close()
      .catch((e) => console.error("Error closing stream:", e));
    setTimeout(
      () =>
        setupUserCollectionWatch(
          sourceDbCollection,
          domain,
          customersCollection
        ),
      3000
    );
  });

  console.log(
    `Watching ${domain.split(" - ")[1]} users collection for free signups`
  );
  return changeStream;
}

function setupContactUsCollectionWatch(
  sourceDbCollection: Collection,
  domain: string,
  ContactUsCollection: Collection
) {
  const changeStream = sourceDbCollection.watch();
  activeChangeStreams.push(changeStream);

  console.log(
    "Active Streams in setUp Contact Us: ",
    activeChangeStreams.length
  );

  changeStream.on("change", async (change) => {
    console.log(
      `Change event in Contact us collection of ${domain.split(" - ")[1]}:`,
      change
    );
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
  });

  changeStream.on("error", (err) => {
    console.error(
      `Change Stream Error in ${domain.split(" - ")[1]}:`,
      err.message
    );
    setTimeout(
      () =>
        setupContactUsCollectionWatch(
          sourceDbCollection,
          domain,
          ContactUsCollection
        ),
      3000
    );
  });
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
    if (change.operationType === "insert") {
      const newOrder = change.fullDocument;

      if (newOrder?.isPaid === false) {
        console.log(
          `New Unpaid order from (${domain.split(" - ")[1]}) detected:`,
          newOrder._id
        );

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
              console.log(
                `Successfully processed abandoned cart for order ${newOrder._id}`
              );

              if (orderStatus?.isPaid === false) {
                // Use the same client for all operations
              }
            } catch (error) {
              console.error("Error processing abandoned cart:", error);
              pendingOrders.delete(orderId);
            }
          })();
        }, 1 * 60 * 1000);
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
          `Order payment is now paid on ${domain.split(" - ")[1]}:`,
          orderId
        );
        pendingOrders.delete(orderId);

        const cartDeleted = await abandonedCartsCollection.deleteOne({ 
          originId: new ObjectId(orderId) 
        });

        if (cartDeleted.deletedCount > 0) {
          console.log(`Removed abandoned cart for order ${orderId} that was subsequently paid`);
          
          // Optionally, clean up the associated logs and leads
          // This can be done by finding and deleting them
          // Or you can add a flag in the schema that marks them as "converted"

          await Log.findOneAndUpdate(
            { syncedId: new ObjectId(orderId) },
            { 
              $set: {
                synced: "unpaid to paid & discarded abandoned cart",
              }
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
              }
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
          console.log(`Successfully processed paid order ${updatedOrder._id}`);

          // If we have the order result, update the lead with the new order reference
          if (orderResult?.insertedId) {
            await Lead.findOneAndUpdate(
              { abandoned_cart: new ObjectId(orderId) },
              { 
                $set: {
                  order_creation: orderResult.insertedId,
                  category: "Order Creation" // Update category to reflect the conversion
                }
              }
            );
          }
        } catch (error) {
          console.error("Error processing paid order:", error);
        }
      }
    }
  });

  changeStream.on("error", (err) => {
    console.error(`Change Stream Error in Orders ${domain}:`, err.message);
    const index = activeChangeStreams.indexOf(changeStream);
    if (index !== -1) {
      activeChangeStreams.splice(index, 1);
    }
    changeStream
      .close()
      .catch((e) => console.error("Error closing stream:", e));

    // Only restart if the listener is still active
    if (isListenerActive) {
      setTimeout(() => {
        setupOrderCollectionWatch(
          collection,
          domain,
          abandonedCartsCollection,
          ordersCollection
        );
      }, 5000);
    }
  });

  console.log(
    `Watching ${domain.split(" - ")[1]} orders collection. Active streams: ${
      activeChangeStreams.length
    }`
  );
  return changeStream;
}

async function syncToTargetCollection(
  document: any,
  domain: string,
  targetCollection: Collection,
  type: string,
  session?: any
) {
  console.log(`${type} on ${domain.split(" - ")[1]}`);

  const exists = await targetCollection.findOne({
    originId: new ObjectId(document._id.toString()),
  });

  if (exists) {
    console.log(
      `Skipping duplicate entry from ${domain.split(" - ")[1]}`,
      document._id
    );
    return null;
  }

  try {
    // Insert into targetCollection
    const syncedData = {
      ...document,
      originId: document._id,
      domain,
      syncedAt: new Date(),
    };
    delete syncedData._id;

    const insertResult = await targetCollection.insertOne(syncedData);

    if (!insertResult || !insertResult.insertedId)
      throw new Error(`Failed to insert into ${targetCollection}`);

    console.log(
      `Successfully inserted into ${targetCollection} collection: ${insertResult.insertedId}`
    );

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
    // Now create a lead entry with custom data
    const leadData = new Lead({
      category: category,
      ...leadFields,
      domain: formattedDomain,
      status: "Pending",
      resolve_status: "Pending",
      assigned: false,
      createdAt: new Date(),
      next_follow_up_date: null,
      conversion_value: null,
    });

    // Use the MongoDB session with Mongoose save
    const leadResult = await leadData.save();

    console.log(`Lead created with ID: ${leadResult._id}`);
    
    // Return the insert result
    return insertResult;
  } catch (error: any) {
    console.error(`Error syncing data from ${domain}:`, error);
    throw error;
  }
}

function getLeadDetails(type: string, insertedId: ObjectId, domain: string) {
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
    order_creation: type === "Order Creation" ? insertedId : null,
  };

  const formattedDomain =
    type === "Order Creation" || type === "Abandoned Cart"
      ? domain.split(" - ")[1].split(" ")[0]
      : domain.split(" - ")[1];

  return { category, leadFields, formattedDomain };
}

// Add this function to periodically check connection health
function setupConnectionMonitoring() {
  const CHECK_INTERVAL = 5 * 60 * 1000;

  setInterval(async () => {
    try {
      if (!master_client || !outreach_client) {
        console.warn("One or both clients are null.");
        await restartWatchers();
        return;
      }

      // Test both connections
      const [masterPing, outreachPing] = await Promise.all([
        master_client
          .db("admin")
          .command({ ping: 1 })
          .catch(() => null),
        outreach_client
          .db("admin")
          .command({ ping: 1 })
          .catch(() => null),
      ]);

      if (!masterPing || !outreachPing) {
        console.warn(
          "Database connection health check failed, restarting watchers"
        );
        await restartWatchers();
      } else {
        console.log(
          `Health check: ${activeChangeStreams.length} active streams`
        );
      }
    } catch (error) {
      console.error("Health check failed:", error);
      await restartWatchers();
    }
  }, CHECK_INTERVAL);
}
// Function to stop all active change streams
export async function stopWatching() {
  activeChangeStreams.forEach((stream) => {
    try {
      stream.close();
    } catch (err) {
      console.error("Error closing change stream: ", err);
    }
  });
  activeChangeStreams = [];
  isListenerActive = false;

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

async function restartWatchers() {
  console.log("Restarting watchers in 5 seconds...");
  await stopWatching();
  // await watchCollections();
  setTimeout(() => {
    watchCollections();
  }, 5000);
}
