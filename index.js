// server.js
const express = require("express");
const app = express();
require("dotenv").config();
const port = process.env.MY_PORT || 5000;
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:5173", "https://auth-practice-eaa42.web.app"],
    credentials: true,
  })
);

// MongoDB connection
const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASSWORD}@cluster11.spsqp4v.mongodb.net/?retryWrites=true&w=majority&appName=Cluster11`;
const client = new MongoClient(uri, {
  serverApi: { version: "1", strict: true, deprecationErrors: true },
});

const createSearchIndex = async (collection) => {
  const existing = await collection.indexes();
  const exists = existing.some((i) => i.name === "TextIndexForSearch");
  if (!exists) {
    await collection.createIndex(
      { title: "text", description: "text", category: "text" },
      { name: "TextIndexForSearch" }
    );
  }
};

async function run() {
  try {

    const db = client.db("blogServer");
    const blogs = db.collection("blogCollection");
    const wishlist = db.collection("wishListCollection");
    const comments = db.collection("comments");

    await createSearchIndex(blogs);

    const verifyCookie = (req, res, next) => {
      const token = req.cookies?.accessToken;
      if (!token) return res.status(401).json({ message: "No token" });
      jwt.verify(token, process.env.secreatKey, (err, decoded) => {
        if (err) return res.status(401).json({ message: "Invalid token" });
        req.decoded = decoded;
        next();
      });
    };

    // Routes
    app.get("/", (req, res) => res.send("Server is running"));

    app.post("/jwtCreate", (req, res) => {
      const { email } = req.body;

      // 🛑 Validate email
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      try {
        // 🔐 Create JWT Token
        const token = jwt.sign({ userEmail: email }, process.env.secreatKey, {
          expiresIn: "1h",
        });

        // 🍪 Set JWT token as HttpOnly cookie
        res.cookie("accessToken", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "None",
          maxAge: 60 * 60 * 1000,
        });

        // ✅ Respond success
        res
          .status(200)
          .json({ success: true, message: "JWT created & cookie set" });
      } catch (err) {
        console.error("JWT creation error:", err);
        res.status(500).json({ error: "Internal Server Error" });
      }
    });

    app.post("/add-blog", verifyCookie, async (req, res) => {
      const { email, blog } = req.body;
      if (email !== req.decoded.userEmail)
        return res.status(401).send({ message: "Unauthorized" });
      const result = await blogs.insertOne(blog);
      res.send(result);
    });

    app.get("/all-blogs", async (_, res) =>
      res.send(await blogs.find().toArray())
    );

    app.get("/singleblog/:id", async (req, res) => {
      const result = await blogs.findOne({ _id: new ObjectId(req.params.id) });
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
        const result = await blogs.find(query).toArray();
        res.json(result);
      } catch (err) {
        res.status(500).json({ message: "Server error" });
      }
    });

    app.post("/wishlist", async (req, res) => {
      const result = await wishlist.insertOne(req.body);
      res.status(201).send(result);
    });

    app.get("/all-wishlist", verifyCookie, async (req, res) => {
      console.log("Received cookie token:", req.cookies.accessToken);
      const result = await wishlist
        .find({ wishListEmail: req.query.email })
        .toArray();
      res.send(result);
    });

    app.delete("/wish-list-remove/:id", async (req, res) => {
      const result = await wishlist.deleteOne({ _id: req.params.id });
      res.send(result);
    });

    app.put("/update/:id", async (req, res) => {
      const result = await blogs.updateOne(
        { _id: new ObjectId(req.params.id) },
        { $set: req.body }
      );
      res.send(result);
    });

    app.post("/comment", async (req, res) => {
      const result = await comments.insertOne(req.body);
      res.send(result);
    });

    app.get("/commenFind/:id", async (req, res) => {
      const result = await comments
        .find({ commentPostId: req.params.id })
        .toArray();
      res.send(result);
    });
    app.delete("/commentDelet/:id", (req, res) => {
      const id = req.params.id;
    

      const query = { _id: new ObjectId(id) };
      const delet = comments.deleteOne(query);
      res.send(delet)
    });
    // Practice routes
    app.delete("/deleteAllblog", async (_, res) =>
      res.send(await blogs.deleteMany())
    );
    app.delete("/deleteAllWishList", async (_, res) =>
      res.send(await wishlist.deleteMany())
    );
    app.get("/all-wishlistPractice", async (_, res) =>
      res.send(await wishlist.find().toArray())
    );
    app.get("/commentall", async (_, res) =>
      res.send(await comments.find().toArray())
    );
    app.delete("/commentalldelet", async (_, res) =>
      res.send(await comments.deleteMany())
    );
  } catch (err) {
    console.error("Server error:", err);
  }
}

run()
  .then(() => {
    app.listen(port, () => console.log(`Server running on port ${port}`));
  })
  .catch((err) => console.error("Failed to start server:", err));
