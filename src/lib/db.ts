import mongoose from "mongoose";

const MONGOOSE_URL = process.env.MONGODB_URI!;

if(!MONGOOSE_URL) {
    throw new Error('Please define MONGODB_URI');
}

export async function connectToDB() {
    if(mongoose.connection.readyState >= 1) return;
    return mongoose.connect(MONGOOSE_URL);
}