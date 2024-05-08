const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
const app = express();

// middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.308otot.mongodb.net`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // await client.connect();

    const jobsCollections = client.db("marketplace-sesson").collection("jobs");
    const bidsCollections = client.db("marketplace-sesson").collection("bids");

    // APIs here
    app.get("/jobs", async (req, res) => {
      const result = await jobsCollections.find().toArray();
      res.send(result);
    });

    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const result = await jobsCollections.findOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // get my all jobs
    app.get("/jobs-email/", async (req, res) => {
      const email = req.query?.email;
      let query = {};
      if (email) {
        query = { "buyer.email": email };
      }
      const result = await jobsCollections.find(query).toArray();
      res.send(result);
    });

    // save a job in db
    app.post("/jobs", async (req, res) => {
      const result = await jobsCollections.insertOne(req.body);
      res.send(result);
    });

    app.put("/jobs/:id", async (req, res) => {
      const updatedJob = req.body;
      const query = { _id: new ObjectId(req.params.id) };
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          ...updatedJob,
        },
      };
      const result = await jobsCollections.updateOne(
        query,
        updatedDoc,
        options
      );
      res.send(result);
    });

    app.delete("/jobs/:id", async (req, res) => {
      const query = { _id: new ObjectId(req.params.id) };
      const result = await jobsCollections.deleteOne(query);
      res.send(result);
    });

    // save a bid data in database
    app.post("/bid", async (req, res) => {
      const result = await bidsCollections.insertOne(req.body);
      res.send(result);
    });

    // get all bids for a user by email from db
    app.get("/myBids", async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { email: email };
      }
      const result = await bidsCollections.find(query).toArray();
      res.send(result);
    });

    // get all bids for jobs owner / buyer
    app.get("/bidRequest", async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { "buyer.email": email };
      }
      const result = await bidsCollections.find(query).toArray();
      res.send(result);
    });

    // update bid status
    app.patch("/bid/:id", async (req, res) => {
      const id = req.params.id;
      const status = req.body;
      const query = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: status,
      };
      const result = await bidsCollections.updateOne(query, updatedDoc);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Server running");
});

app.listen(port, () => {
  console.log(`server running on port ${port}`);
});
