import { MongoClient } from 'mongodb';
let connection;
export async function savesCollection() {
  connection ||= new MongoClient(process.env.MONGODB_URI, { maxPoolSize: 5, serverSelectionTimeoutMS: 8000 }).connect().catch(error => { connection = null; throw error; });
  return (await connection).db(process.env.MONGODB_DATABASE || 'learning_games').collection('game_saves');
}
