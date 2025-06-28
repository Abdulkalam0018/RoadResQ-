import { User } from '../models/user.model.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/roadresq')
  .then(() => console.log('MongoDB connected for index creation'))
  .catch((err) => console.error('MongoDB connection error:', err));

async function createIndexes() {
  try {
    // Ensure the 2dsphere indexes are created
    await User.collection.createIndex({ location: '2dsphere' });
    console.log('Created 2dsphere index on location');
    
    await User.collection.createIndex({ 'garages.location': '2dsphere' });
    console.log('Created 2dsphere index on garages.location');
    
    console.log('All indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
  } finally {
    // Close the connection
    mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

createIndexes();