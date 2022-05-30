const express = require('express')
const app = express()
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId, ObjectID } = require('mongodb');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);


// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kx9ii.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'UnAuthorized access' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access' })
    }
    req.decoded = decoded;
    next();
  });
}
async function run() {
  try {
    await client.connect();
    const toolsCollection = client.db("products").collection('tools');
    const reviewCollection = client.db("products").collection('reviews');
    const userCollection = client.db("products").collection('users');
    const userInfoCollection = client.db("products").collection('usersInfo');
    const orderCollection = client.db("products").collection('orders');
    const paymentCollection = client.db("products").collection('payments');

    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({ email: requester });
      if (requesterAccount.role === 'admin') {
        next();
      }
      else {
        res.status(403).send({ message: 'forbidden' });
      }
    }

    app.post('/create-payment-intent', verifyJWT, async (req, res) => {
      const toolName = req.body;
      const pricePerunit = toolName.pricePerunit;
      const amount = pricePerunit * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({ clientSecret: paymentIntent.client_secret })
    });

    app.get('/tools', async (req, res) => {
      const query = {};
      const cursor = toolsCollection.find(query);
      const tools = await cursor.toArray();
      res.send(tools);
    });

    app.post('/tools', async (req, res) => {
      const newTools = req.body;
      const result = await toolsCollection.insertOne(newTools);
      res.send(result);
    })

    // individual Order
    app.get('/booking', async (req, res) => {
        const email = req.query.email;
        const query = { email: email };
        const bookings = await orderCollection.find(query).toArray();
        res.send(bookings)
      })
      // app.get('/edituser',async(req,res)=>{
      //   const email= req.query.email;
      //   const query = {email:email};
      //   const bookings = await userInfoCollection.find(query).toArray();
      //   res.send(bookings)
      // })
  
      // app.put('/edituser',async(req,res)=>{
      //   const email= req.query.email;
      //   updatedUser = req.body;
      //   const query = {email:email};
      //   const options = {upsert:true}
      //   const updatedDoc = {
      //     $set:updatedUser
      //   }
      //   const bookings = await userInfoCollection.updateOne(query,updatedDoc,options)
      //   res.send(bookings)
      // })
  
  
      app.get('/order/:id', verifyJWT, async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const order = await orderCollection.findOne(query);
        res.send(order);
      })