import { MongoClient } from 'mongodb';
let connection;
export async function savesCollection() {
  connection ||= new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 5, serverSelectionTimeoutMS: 8000 }).connect().catch(error => { connection = null; throw error; });
  return (await connection).db(process.env.MONGODB_DATABASE || 'learning_games').collection('game_saves');
}

let learningIndexes;
export async function learningCollection() {
  await savesCollection();
  const collection = (await connection).db(process.env.MONGODB_DATABASE || 'learning_games').collection('learning_events');
  learningIndexes ||= Promise.all([collection.createIndex({ accountId: 1, _id: 1 }), (await savesCollection()).createIndex({ parentId: 1 })]).catch(error => { learningIndexes = null; throw error; });
  await learningIndexes;
  return collection;
}

export async function learnersCollection() {
  await savesCollection();
  return (await connection).db(process.env.MONGODB_DATABASE || 'learning_games').collection('learning_learners');
}
