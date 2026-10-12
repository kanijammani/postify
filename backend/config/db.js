const mongoose = require('mongoose');

const connectDB = async () => {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!uri) {
        const errorMsg =
            'MongoDB connection URI is missing!\n' +
            'Please set MONGO_URI in your backend/.env file.\n' +
            'Examples:\n' +
            '  - Local MongoDB: MONGO_URI=mongodb://127.0.0.1:27017/postify\n' +
            '  - MongoDB Atlas: MONGO_URI=mongodb+srv://<username>:<password>@cluster0.ynu5nzg.mongodb.net/postify?retryWrites=true&w=majority';
        console.error(errorMsg);
        throw new Error(errorMsg);
    }

    try {
        const conn = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log(`MongoDB Connected successfully: ${conn.connection.host} (DB: ${conn.connection.name})`);
        return conn;
    } catch (error) {
        let helpfulMessage = `MongoDB connection failed: ${error.message}`;

        if (error.message.includes('whitelist') || error.message.includes('Could not connect to any servers')) {
            helpfulMessage += '\n-> Diagnosis: Atlas IP Whitelist Issue or Cluster unreachable.';
            helpfulMessage += '\n-> Fix: Go to MongoDB Atlas -> Network Access -> Add IP Address -> Add 0.0.0.0/0 (or your current IP).';
            helpfulMessage += '\n-> Alternative: Use local MongoDB Community Server by setting MONGO_URI=mongodb://127.0.0.1:27017/postify in backend/.env.';
        } else if (error.message.includes('Authentication failed') || error.message.includes('bad auth')) {
            helpfulMessage += '\n-> Diagnosis: Invalid MongoDB username or password.';
            helpfulMessage += '\n-> Fix: Check the credentials in MONGO_URI inside your backend/.env file.';
        } else if (error.message.includes('ECONNREFUSED')) {
            helpfulMessage += '\n-> Diagnosis: Local MongoDB server is not running.';
            helpfulMessage += '\n-> Fix: Start MongoDB service via Windows Services or run "mongod" in your terminal.';
        }

        console.error(helpfulMessage);
        throw new Error(helpfulMessage);
    }
};

module.exports = connectDB;
