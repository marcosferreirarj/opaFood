// SDK Admin do Firebase — exclusivo para Server Components e Route Handlers.
// NUNCA importe este arquivo em Client Components ('use client').
import 'server-only';

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function createAdminApp() {
  if (getApps().length > 0) return getApps()[0];

  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  const isCredentialValid =
    projectId &&
    clientEmail?.includes('@') &&
    privateKey?.includes('-----BEGIN PRIVATE KEY-----') &&
    !privateKey?.includes('...');

  // Sem credenciais de serviço, inicializa só com projectId.
  // Leituras server-side via Admin SDK retornarão erro — configure
  // FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY para habilitar.
  if (!isCredentialValid) {
    return initializeApp({ projectId: projectId || 'unconfigured-project' });
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

const adminApp = createAdminApp();
export const adminDb   = getFirestore(adminApp);
export const adminAuth = getAuth(adminApp);
