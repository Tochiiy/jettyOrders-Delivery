import { MongoClient, Db } from "mongodb";
import logger from "../utils/logger.js";

let client: MongoClient;
let db: Db;

export const connectDb = async (): Promise<Db> => {
  if (db) return db;

  client = new MongoClient(process.env.MONGO_URI!);
  await client.connect();

  db = client.db(process.env.DB_NAME);

  logger.info("Admin service connected to mongodb");

  return db;
};
