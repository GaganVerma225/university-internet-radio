import config from './../config/config.js'
import mongoose from 'mongoose'

const connectDB = async () => {
    try {
        mongoose.Promise = global.Promise;
        await mongoose.connect(config.mongoUri);
    
        mongoose.connection.on('error', (err) => {
            console.error(`Unable to connect to database: ${err.message}`);
            throw new Error(`unable to connect to database: ${config.mongoUri}`)
        })
    } catch (error) {
        console.log("MONGODB connection error ", error);
        process.exit(1);
    }
};

export default connectDB;