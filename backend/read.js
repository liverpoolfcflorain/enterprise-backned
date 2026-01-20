const express = require('express');
const app = express();
const port = 3000;
const { MongoClient } = require('mongodb');
const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri);
const cors = require('cors');
app.use(cors());


app.use(express.json());


async function connect() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        const db = client.db('myapp');
        const usercollection = db.collection('users');
    }
     catch(err){
        console.log('Error connecting to MongoDB:', err);
     }
    }
connect();

app.get('/myapp/users', async (req, res) => {
    try {
        const db = client.db('myapp');
        
        const usercollection = db.collection('users');
        
        const users = await usercollection.find({}).toArray();
        
        console.log(users);
        
        res.json(users);
    } catch (err) {
        console.log('Error fetching users:', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(3000, () => {
    console.log(`Server running at http://localhost:3000`);
});