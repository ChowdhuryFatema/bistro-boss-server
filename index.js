const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

// middleware 
app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zxai2xc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();


        const userCollection = client.db("bistroDb").collection("users");
        const menuCollection = client.db("bistroDb").collection("menu");
        const reviewsCollection = client.db("bistroDb").collection("reviews");
        const cartsCollection = client.db("bistroDb").collection("carts");


        // middlewares
        const verifyToken = (req, res, next) => {
            // console.log('inside verifyToken', req.headers);
            if(!req.headers.authorization){
                return res.status(401).send({message: 'unauthorized access'})
            }
            const token = req.headers.authorization.split(' ')[1]
            jwt.verify(
                token, 
                process.env.ACCESS_TOKEN_SECRET, 
                (err, decoded) => {
                    if(err){
                        return res.status(401).send({message: 'unauthorized access'})
                    }
                    req.decoded = decoded;
                    next();
                })
        }

        // user verify admin after verify token
        const verifyAdmin = async(req, res, next) => {
            const email = req.decoded.email;
            const query = {email: email}
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if(!isAdmin){
                return res.status(403).send({message: 'forbidden access'})
            }
            next();
        }



        // jwt related api 
        app.post('/jwt', async(req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '365d' });
            res.send({token});
        })

        // user collection 
        app.get('/users', verifyToken, verifyAdmin, async(req, res) => {
            
            const result = await userCollection.find().toArray();
            res.send(result)
        })


        app.get('/users/admin/:email', verifyToken, async(req, res) => {
            const email = req.params.email;
            if(email !== req.decoded.email){
                return res.status(403n({message: 'forbidden access'}))
            }

            const query = {email: email};
            const user = await userCollection.findOne(query);
            let admin = false;
            if(user){
                admin = user?.role === 'admin'
            }
            res.send({admin})
        })

        app.post('/users', async(req, res) => {
            const user = req.body;

            // insert email if user doesn't exists:
            const query = {email: user?.email};
            const existingUser = await userCollection.findOne(query);
            if(existingUser){
                return res.send({message: 'User already exists', insertedId: null})
            }
            const result = await userCollection.insertOne(user);
            res.send(result)
        })

        app.patch('/users/admin/:id', verifyToken, verifyAdmin, async(req, res) => {
            const id = req.params.id;
            const filter = {_id: new ObjectId(id)}
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result)

        })

        app.delete('/users/:id', verifyToken, verifyAdmin, async(req, res) => {
            const id = req.params.id;
            const query = {_id: new ObjectId(id)}
            const result = await userCollection.deleteOne(query);
            res.send(result);
        })


         // menu collection 
        app.get('/menu', async(req, res) => {
            const result = await menuCollection.find().toArray();
            res.send(result)
        })

        app.get('/menu/:id', async(req, res) => {
            const id = req.params.id;
            const query = { _id: id }
            const result = await menuCollection.findOne(query);
            res.send(result)
        })

        app.post('/menu', verifyToken, verifyAdmin, async(req, res) => {
            const item = req.body;
            const result = await menuCollection.insertOne(item);
            res.send(result);
        })

        app.delete('/menu/:id', verifyToken, verifyAdmin, async(req, res) => {
            const id = req.params.id;
            const query = { _id: id }
            const result = await menuCollection.deleteOne(query);
            res.send(result);
        })


          // reviews collection 
        app.get('/reviews', async(req, res) => {
            const result = await reviewsCollection.find().toArray();
            res.send(result);
        })

        // carts collection 
        app.get('/carts', async(req, res) => {
            const email = req.query.email;
            const query = {email: email}
            const result = await cartsCollection.find(query).toArray();
            res.send(result);
        })

        app.post('/carts', async(req, res) => {
            const cartItem = req.body;
            const result = await cartsCollection.insertOne(cartItem);
            res.send(cartItem);
        })

        app.delete('/carts/:id', async(req, res) => {
            const id = req.params.id;
            const query = {_id: new ObjectId(id)}
            const result = await cartsCollection.deleteOne(query);
            res.send(result)
        })


        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Bistro Boss is running')
})

app.listen(port, () => {
    console.log(`The server is running on port ${port}`);
})