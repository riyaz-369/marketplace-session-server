const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
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
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.308otot.mongodb.net`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// my middleware for verify token
const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  // console.log(token);
  if (!token) return res.status(401).send({ message: "unauthorized access" });
  if (token) {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        console.log(err);
        return res.status(401).send({ massage: "unauthorized access" });
      }
      // console.log( decoded);
      req.user = decoded;
      next();
    });
  }
};

async function run() {
  try {
    // await client.connect();

    // jwt generate
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      // console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "7d",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        })
        .send({ success: true });
    });

    app.post("/logout", async (req, res) => {
      const user = req.body;
      // console.log("logging out user", user);
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

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

    // get my all jobs a specific user using query email
    app.get("/jobs-email", verifyToken, async (req, res) => {
      const tokenEmail = req?.user?.email;
      const email = req?.query?.email;
      if (tokenEmail !== email) {
        return res.status(403).send({ massage: "forbidden access" });
      }
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
    app.get("/myBids", verifyToken, async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { email: email };
      }
      const result = await bidsCollections.find(query).toArray();
      res.send(result);
    });

    // get all bids for jobs owner / buyer
    app.get("/bidRequest", verifyToken, async (req, res) => {
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
