// Quick one-off script to update minStems from 5 to 1 in the database
import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('No MONGODB_URI'); process.exit(1); }

async function main() {
  await mongoose.connect(MONGODB_URI);
  const result = await mongoose.connection.db.collection('storeSettings').updateOne(
    { key: 'main' },
    { $set: { 'bouquetBuilder.minStems': 1 } }
  );
  console.log('Updated:', result.modifiedCount ? 'minStems set to 1' : 'no document found or already 1');
  await mongoose.disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
