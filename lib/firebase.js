// SDK do Firebase para uso no BROWSER (Client Components)
import { initializeApp, getApps } from 'firebase/app';
import { getAuth }      from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage }   from 'firebase/storage';

// Em modo dev (NEXT_PUBLIC_DEV_LOGIN=true) os valores reais não são necessários
// pois nenhuma chamada ao Firebase é feita. Os placeholders evitam o crash na inicialização.
const DEV_MODE = process.env.NEXT_PUBLIC_DEV_LOGIN === 'true';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY            || (DEV_MODE ? 'dev-placeholder' : undefined),
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN        || (DEV_MODE ? 'dev.firebaseapp.com' : undefined),
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID         || (DEV_MODE ? 'dev-project' : undefined),
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET     || (DEV_MODE ? 'dev-project.appspot.com' : undefined),
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || (DEV_MODE ? '000000000000' : undefined),
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID             || (DEV_MODE ? '1:000000000000:web:dev' : undefined),
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);
