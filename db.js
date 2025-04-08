const mongoose = require('mongoose');

const MONGODB_URI = "mongodb+srv://root:root@cluster0.837sd.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"


const connectToDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useCreateIndex: true,
      useFindAndModify: false,
    });

    console.log('Connected to MongoDB!');
  } catch (error) {
    console.error(`Error while connecting to MongoDB: `, error.message);
  }
};

module.exports = connectToDB;

// root
//root
