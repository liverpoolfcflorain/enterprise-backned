
const express = require('express');
const { MongoClient } = require('mongodb');
const uri = 'mongodb://localhost:27017/';
const client = new MongoClient(uri);
const app = express();
const cors = require('cors');
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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

app.put('/myapp/user', async (req, res) => { 
    try{
        const { username, password } = req.body;
        const db = client.db('myapp');
        const usercollection = db.collection('users');

      
        console.log('Received data:', req.body);

        const result = await usercollection.insertOne({
            username:username,
            password:password
        });
        console.log('User added:', result);
        
       
        res.json({ message: "User added successfully", received: req.body });
    }
    catch(err){
        console.log('Error adding user:', err);
    }
});        

app.listen(3000, () => console.log(`Server running at http://localhost:3000`));