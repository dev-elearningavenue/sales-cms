import { MongoClient, ObjectId, Collection, ChangeStream } from "mongodb";
import mongoose from "mongoose";
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
    changeStream.close().catch((e) => console.error("Error closing stream:", e));
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
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
          setTimeout(async () => {
            const orderStatus = await collection.findOne(
              { _id: newOrder._id },
              { session }
            );

            if (orderStatus?.isPaid === false) {
              await syncToTargetCollection(
                newOrder,
                `${domain} (Unpaid)`,
                abandonedCartsCollection,
                "Abandoned Cart",
                session
              );
              await session.commitTransaction();
            } else {
              // ✅ `isPaid = true` ho gaya, rollback transaction
              await session.abortTransaction();
            }
            session.endSession();
          }, 1 * 60 * 1000); //delay time: 1 min
        } catch (error) {
          console.error("Transaction failed", error);
          await session.abortTransaction();
          session.endSession();
        }
      }
    } else if (change.operationType === "update") {
      const updatedOrder = await collection.findOne({
        _id: change.documentKey._id,
      });

      const isPaidNow = updatedOrder?.isPaid;
      const wasPaidBefore =
        change.updateDescription?.updatedFields?.isPaid !== undefined
          ? !change.updateDescription.updatedFields.isPaid
          : updatedOrder?.isPaid;

      if (wasPaidBefore === false && isPaidNow === true) {
        await abandonedCartsCollection.deleteOne({ _id: updatedOrder._id });

        await syncToTargetCollection(
          updatedOrder,
          `${domain} (Paid)`,
          ordersCollection,
          "Order Creation"
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

async function syncToTargetCollection(
  document: any,
  domain: string,
  targetCollection: Collection,
  type: string,
  session?: mongoose.ClientSession
) {
  console.log(`New document on ${domain.split(" - ")[1]} detected:`);

  const exists = await targetCollection.findOne(
    { originId: new ObjectId(document._id.toString()) },
    { session: session || undefined }
  );

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

    const insertResult = await targetCollection.insertOne(syncedData, {
      session: session || undefined,
    });

    if (!insertResult || !insertResult.insertedId)
      throw new Error(`Failed to insert into ${targetCollection}`);

    const logData = new Log({
      sourceDbId: new ObjectId(document._id.toString()),
      syncedId: insertResult.insertedId,
      sourceDomain: domain,
      description: `Log created for sync from ${domain} to target collection.`,
      synced: "success",
    });

    const logResult = session
      ? await logData.save({ session })
      : await logData.save();

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

    const leadResult = session
      ? await leadData.save({ session })
      : await leadData.save();

    console.log(`Lead created: `, leadResult);
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
    // watchCollections();
  }, 5000);
}
