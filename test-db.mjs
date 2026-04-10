import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const apiKeyMatch = env.match(/NEXT_PUBLIC_FIREBASE_API_KEY=(.*)/);
const projectIdMatch = env.match(/NEXT_PUBLIC_FIREBASE_PROJECT_ID=(.*)/);

const firebaseConfig = {
  apiKey: apiKeyMatch ? apiKeyMatch[1].trim() : '',
  projectId: projectIdMatch ? projectIdMatch[1].trim() : '',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const storesSnapshot = await getDocs(collection(db, 'stores'));
  console.log('Stores count:', storesSnapshot.docs.length);
  for (const storeDoc of storesSnapshot.docs) {
    const data = storeDoc.data();
    console.log(`Store: ${storeDoc.id}, slug: ${data.slug}`);
    if (data.slug) {
      const slugDoc = await getDoc(doc(db, 'slugs', data.slug));
      console.log(`\tSlug in 'slugs' collection: ${slugDoc.exists() ? 'YES' : 'NO'}`);
    }
  }
}

run().catch(console.error);
