import { MongoClient, ObjectId, Collection, ChangeStream } from "mongodb";
import Log from "@/models/log";
import Lead from "@/models/lead";

// const { MongoClient } = pkg;
console.log("mongoListener.ts loaded");
const mongoUri_Master = process.env.CLUSTER_MASTER as string;
const mongoUri_Outreach = process.env.CLUSTER_OUTREACH as string;

let master_client = new MongoClient(mongoUri_Master);
let outreach_client = new MongoClient(mongoUri_Outreach);

let activeChangeStreams: ChangeStream[] = [];
// let isListenerActive = false; // To prevent multiple instances
let isWatcherInitialized = false;

export async function watchCollections() {
  if (isWatcherInitialized) {
    console.log("Change Stream is already running!", isWatcherInitialized);
    return;
  }
  stopAllStreams();
  console.log("Active Streams: ", activeChangeStreams.length);
  console.log("Before setting isWatcherInitialized:", isWatcherInitialized);
  isWatcherInitialized = true;
  console.log("After setting isWatcherInitialized:", isWatcherInitialized);

  try {
    await master_client.connect();
    await outreach_client.connect();

    const leads_db = master_client.db("lead-management");
    const oes_db = master_client.db("oes");
    const ooc_db = master_client.db("oshaonlinecenter");
    const oor_db = outreach_client.db("osha-outreach-lms");

    // Target Collections
    const customersCollection = leads_db.collection("customers");
    const abandonedCartsCollection = leads_db.collection("abandonedcarts");
    const logsCollection = leads_db.collection("logs");
    const contactUsCollection = leads_db.collection("contacts");
    // const leadsCollection = leads_db.collection("leads");

    console.log("Watching for changes in multiple collections...");

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
      setupOrderCollectionWatch(collection, domain, customersCollection);
    });
    /*
    // Watch user collections from different databases for freeSignup=true
    setupUserCollectionWatch(
      ooc_db.collection("users"),
      "Osha Online Center - OOC",
      customersCollection,
      logsCollection,
      leadsCollection
    );

    setupUserCollectionWatch(
      oes_db.collection("users"),
      "Osha Education School - OES",
      customersCollection,
      logsCollection,
      leadsCollection
    );

    setupUserCollectionWatch(
      oor_db.collection("users"),
      "Osha Outreach - OOR",
      customersCollection,
      logsCollection,
      leadsCollection
    );
    */

    // You could add more specialized watchers here for contact forms, scholarship etc.

    console.log("watchCollection function is running");
  } catch (error) {
    console.error("Error in Change Stream:", error);
    isWatcherInitialized = false;
  }
}

// Setup function for user collections with free signup check
function setupUserCollectionWatch(
  sourceDbCollection: Collection,
  domain: string,
  customersCollection: Collection
  // logsCollection: Collection,
  // leadsCollection: Collection
) {
  const changeStream = sourceDbCollection.watch();
  activeChangeStreams.push(changeStream);

  changeStream.on("change", async (change) => {
    console.log(`Change event for ${domain.split(" - ")[1]}:`, change);
    if (change.operationType === "insert") {
      const newUser = change.fullDocument;

      // Free signup check
      if (newUser?.freeSignUp === true) {
        await syncToTargetCollection(
          newUser,
          `${domain}`,
          customersCollection
          // logsCollection,
          // leadsCollection
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
    setTimeout(
      () =>
        setupUserCollectionWatch(
          sourceDbCollection,
          domain,
          customersCollection
          // logsCollection,
          // leadsCollection
        ),
      3000
    );
  });

  console.log(
    `Watching ${domain.split(" - ")[1]} users collection for free signups`
  );
  return changeStream;
}

// Setup function for orders collections
function setupOrderCollectionWatch(
  collection: Collection,
  domain: string,
  abandonedCartsCollection: Collection
) {
  const changeStream = collection.watch();
  activeChangeStreams.push(changeStream);

  changeStream.on("change", async (change) => {
    if (
      change.operationType === "insert" ||
      change.operationType === "update"
    ) {
      const newOrder = change.fullDocument;

      // For unpaid orders - check if 20 minutes passed
      if (newOrder?.isPaid === false) {
        const createdAt =
          newOrder.createdAt || new Date(newOrder._id.getTimestamp());

        const timeSinceCreation = new Date().getTime() - createdAt.getTime();
        const twentyMinutesInMs = 20 * 60 * 1000;

        // if (timeSinceCreation >= twentyMinutesInMs) {
        await syncToTargetCollection(
          newOrder,
          `${domain} (Unpaid)`,
          abandonedCartsCollection
          // logsCollection,
          // leadsCollection
        );
        // } else {
        //   console.log(
        //     `Skipping order from ${domain}, less than 20 minutes old:`,
        //     newOrder
        //   );
        // }
      }
      // For paid orders - no additional check
      else if (newOrder?.isPaid === true) {
        await syncToTargetCollection(
          newOrder,
          `${domain} (Paid)`,
          abandonedCartsCollection
        );
      }
    }
  });

  console.log(
    `Watching ${
      domain.split(" - ")[1]
    } orders collection for paid/unpaid orders`
  );
  return changeStream;
}

// Helper function to sync data to customers collection
async function syncToTargetCollection(
  document: any,
  domain: string,
  targetCollection: Collection
) {
  console.log(`New document on ${domain.split(" - ")[1]} detected:`);

  const exists = await targetCollection.findOne({
    originId: new ObjectId(document._id.toString()),
  });

  if (exists) {
    console.log(
      `Skipping duplicate entry from ${domain.split(" - ")[1]}`,
      document._id
    );
    return;
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
    if (!insertResult || !insertResult.insertedId) {
      throw new Error("Failed to insert into customers.");
    }

    const logData = new Log({
      sourceDbId: new ObjectId(document._id.toString()),
      syncedId: insertResult?.insertedId,
      sourceDomain: domain,
      description: `Log created for sync from ${domain} to target collection.`,
      synced: "success",
    });

    const logResult = await logData.save();
    if (!logResult) throw new Error("Failed to insert into Logs.");

    const getRandomCategory = () => {
      return Math.random() < 0.5 ? "Free SignUp" : "Free Study Guide";
    };

    // Now create a lead entry with custom data
    const leadData = new Lead({
      category: getRandomCategory(),
      free_signup: insertResult.insertedId,
      contact_us: null,
      scholarship: null,
      abandoned_cart: null,
      domain: domain.split(" - ")[1],
      status: "Pending",
      resolve_status: "Pending",
      assigned: false,
      createdAt: new Date(),
      next_follow_up_date: null,
      conversion_value: null,
    });
    // const leadResult = await leadsCollection.insertOne(leadData);
    const leadResult = await leadData.save();

    console.log(`Lead created: `, leadResult);
  } catch (error: any) {
    console.error(`Error syncing data from ${domain}:`, error);
    throw error;
  }
}

// Function to stop all active change streams
function stopAllStreams() {
  activeChangeStreams.forEach((stream) => {
    try {
      stream.close();
      console.log("Closed the change stream.", stream);
    } catch (err) {
      console.error("Error closing change stream: ", err);
    }
  });

  activeChangeStreams = [];
  isWatcherInitialized = false;
}

// Add a function to explicitly stop watching
export async function stopWatching() {
  stopAllStreams();
  console.log("All change streams stopped");
  await master_client.close();
  await outreach_client.close();
}

function restartWatchers() {
  console.log("Restarting watchers in 5 seconds...");
  setTimeout(() => {
    watchCollections();
  }, 5000);
}
