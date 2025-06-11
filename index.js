const express = require("express");
const app = express();
require("dotenv").config();
const port = process.env.MY_PORT || 5000;
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

// middlewere
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASSWORD}@cluster11.spsqp4v.mongodb.net/?retryWrites=true&w=majority&appName=Cluster11`;

const client = new MongoClient(uri, {
  serverApi: {
    version: "1",
    strict: true,
    deprecationErrors: true,
  },
});

const createSearchIndex = async (blogCollection) => {
  const existingIndexes = await blogCollection.indexes();
  const indexAlreadyExists = existingIndexes.some(
    (index) => index.name === "TextIndexForSearch"
  );

  if (!indexAlreadyExists) {
    await blogCollection.createIndex(
      { title: "text", description: "text", category: "text" },
      { name: "TextIndexForSearch" }
    );
    // console.log("Text index created.");
  } else {
    // console.log("Text index already exists.");
  }
};

async function run() {
  try {
    await client.connect();
    const blogServer = client.db("blogServer");
    const blogCollection = blogServer.collection("blogCollection");
    const wishListCollection = blogServer.collection("wishListCollection");
    const commentCollection = blogServer.collection("comments");

    // console.log("You successfully connected to MongoDB!");
    createSearchIndex(blogCollection);

    // middlewere api veryfy
    const veryfyCooki = (req, res, next) => {
      const token = req.cookies.accessToken;
      if (!token) {
        return res.status(401).send({ message: "Invlid user" });
      }
      jwt.verify(token, process.env.secretKey, function (err, decoded) {
        if (err) {
          return res.status(401).send({ message: "Invalid User" });
        }

        req.decoded = decoded;
      });
      next();
    };
    //****** ROUTES *****\\
    app.get("/", (req, res) => {
      res.send("Hello World!");
    });

    //****** BLOG ROUTES *****\\
    app.post("/add-blog", veryfyCooki, async (req, res) => {
      const data = req.body;
      const result = await blogCollection.insertOne(data);
      res.send(result);
    });

    app.get("/all-blogs", async (req, res) => {
      const result = await blogCollection.find().toArray();
      res.send(result);
    });

    app.get("/singleblog/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await blogCollection.findOne(query);
      res.send(result);
    });

    app.get("/blogs", async (req, res) => {
      const { search } = req.query;
      let query = {};

      if (search) {
        query = {
          $or: [
            { heading: { $regex: search, $options: "i" } },
            { category: { $regex: search, $options: "i" } },
          ],
        };
      }

      try {
        const blogs = await blogCollection.find(query).toArray();
        res.json(blogs);
      } catch (err) {
        res.status(500).json({ message: "Server error" });
      }
    });

    //****** WISHLIST ROUTES *****\\
    app.post("/wishlist", async (req, res) => {
      const wishListItem = req.body;
      const result = await wishListCollection.insertOne(wishListItem);
      res.status(201).send(result);
    });

    app.get("/all-wishlist", veryfyCooki, async (req, res) => {
      const email = req.query.email;

      if (email !== req.decoded.userEmail) {
        return res.status(401).send({ message: "INvalid user" });
      }
      const query = { wishListEmail: email };
      const result = await wishListCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/wish-list-remove/:id", async (req, res) => {
      const id = req.params.id;
      const result = await wishListCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    app.put("/update/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateCoffee = req.body;
      const updateDoc = { $set: updateCoffee };
      const result = await blogCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    //****** COMMENT ROUTES *****\\
    app.post("/comment", async (req, res) => {
      const comment = req.body;
      const result = await commentCollection.insertOne(comment);
      res.send(result);
    });

    app.get("/commenFind/:id", async (req, res) => {
      const id = req.params.id;
      const query = { commentPostId: id };
      const result = await commentCollection.find(query).toArray();
      res.send(result);
    });

    //****** PRACTICE ROUTES (NOT FOR PRODUCTION) *****\\
    app.delete("/deleteAllblog", async (req, res) => {
      const result = await blogCollection.deleteMany();
      res.send(result);
    });

    app.delete("/deleteAllWishList", async (req, res) => {
      const result = await wishListCollection.deleteMany();
      res.send(result);
    });

    app.get("/all-wishlistPractice", async (req, res) => {
      const result = await wishListCollection.find().toArray();
      res.send(result);
    });

    app.get("/commentall", async (req, res) => {
      const result = await commentCollection.find().toArray();
      res.send(result);
    });

    app.delete("/commentalldelet", async (req, res) => {
      const result = await commentCollection.deleteMany();
      res.send(result);
    });

    // json webtoken create
    app.post("/jwtCreate", (req, res) => {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const token = jwt.sign({ userEmail: email }, process.env.secretKey, {
        expiresIn: "1h",
      });

      res.cookie("accessToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Lax",
        maxAge: 60 * 60 * 1000,
      });

      return res.status(200).json({ success: true, token });
    });
  } catch (err) {
    console.error("Server error:", err);
  }
}

run()
  .then(() => {
    app.listen(port, () => {
      console.log(`✅ Server running on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to start server:", err);
  });
