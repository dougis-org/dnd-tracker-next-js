
const { MongoClient } = require('mongodb');

async function findUser() {
  const uri = "mongodb+srv://dnd-dev-user:5jKuQAAslRErDOIz@dnd-data-cluster.qk0ultz.mongodb.net/dnd-dev?retryWrites=true&w=majority&appName=dnd-data-cluster";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const database = client.db("dnd-dev");
    const users = database.collection("users");

    const user = await users.findOne();
    console.log(user);
  } finally {
    await client.close();
  }
}

findUser();
