const express = require("express");
const app = express();
require("dotenv").config();
const port = process.env.MY_PORT;
app.use(express.json());
const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASSWORD}@cluster11.spsqp4v.mongodb.net/?retryWrites=true&w=majority&appName=Cluster11`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    // SERVER NAME
    const blogServer = await client.db("blogServer");
    const blogCollection = await blogServer.collection("blogCollection");
    console.log("You successfully connected to MongoDB!");

    // 1 : RESPONSE ROUTE
    app.get("/", (req, res) => {
      res.send("Hello World!");
    });

    // 2 : CREATE BLOG
    app.post("/add-blog", async (req, res) => {
      const data = req.body;
      const result = await blogCollection.insertOne(data);
      res.send(result);
    });

    // 3 : GET ALL BLOG
    app.get("/all-blogs", async (req, res) => {
      const result = await blogCollection.find().toArray();
      res.send(result);
    });
  } finally {
  }
}

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
run().catch(console.dir);
