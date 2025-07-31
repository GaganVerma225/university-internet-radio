const config = {
    env: process.env.NODE_ENV || 'development', // To differentiate between development and production modes
    port: process.env.PORT || 3000,  // To define the listening port for the server
    jwtSecret: process.env.JWT_SECRET || "shhhhhhared-secret", // The secret key to be used to sign JWT
    mongoUri: process.env.MONGODB_URI ||  //The location of the MongoDB database instance for the project
        process.env.MONGO_HOST ||
        'mongodb://' + (process.env.IP || 'localhost') + ':' +
        (process.env.MONGO_PORT || '27017') +
        '/university-radio'
}

export default config