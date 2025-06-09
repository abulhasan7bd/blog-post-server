const express = require("express");
const app = express();
require("dotenv").config();
const port = process.env.MY_PORT;
const cors = require("cors");
app.use(express.json());
app.use(cors());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const blogCollection = blogServer.collection("blogCollection");
    // await blogCollection.createIndex({ heading: "text" });
    const wishListCollection = await blogServer.collection(
      "wishListCollection"
    );
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

    // SINGLE BLOG 
    app.get("/singleblog/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await blogCollection.findOne(query);
      res.send(result);
    });
    // 4 : WISH LIST ADD
    app.post("/wishlist", async (req, res) => {
      const wishListItem = req.body;
      const result = await wishListCollection.insertOne(wishListItem);
      res.status(201).send(result);
    });

    app.get("/all-wishlistPractice", async (req, res) => {
      const result = await wishListCollection.find().toArray();
      res.send(result);
    });

    // 5 : WISH LIST FIND BY USER
    app.get("/all-wishlist", async (req, res) => {
      const email = req.query.email;
      const query = { wishListEmail: email };
      const result = await wishListCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/wish-list-remove/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const result = await wishListCollection.deleteOne({
        _id: id,
      });
      res.send(result);
    });

    app.put("/update/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateCoffee = req.body;
      const updateDoc = {
        $set: updateCoffee,
      };
      const result = await blogCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // 6 : DELEATE ALL BLOG
    app.delete("/deleteAllblog", async (req, res) => {
      const result = await blogCollection.deleteMany();
      res.send(result);
    });
    app.delete("/deleteAllWishList", async (req, res) => {
      const result = await wishListCollection.deleteMany();
      res.send(result);
    });

    // 7 : SEARCH IN MONGODB
    app.get("/search", async (req, res) => {
      const searchText = req.query.q;
      try {
        const result = await blogCollection
          .find({ $text: { $search: searchText } })
          .toArray();

        res.send(result);
      } catch (error) {
        console.error("Search error:", error.message);
        res.status(500).send({ message: "Search failed" });
      }
    });
  } finally {
  }
}

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
run().catch(console.dir);
