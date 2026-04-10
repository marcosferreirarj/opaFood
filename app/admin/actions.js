'use server';

import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { randomBytes } from 'crypto';

function generateTempPassword() {
  return randomBytes(12).toString('base64url'); // ~16 chars, URL-safe
}

// ─── helpers ──────────────────────────────────────────────────────────────────

async function verifyAdmin(idToken) {
  const decoded = await adminAuth.verifyIdToken(idToken);
  console.log('🔍 [Admin Auth] UID decodificado:', decoded.uid);
  console.log('🔍 [Admin Auth] UID esperado (ENV):', process.env.ADMIN_UID);

  if (decoded.uid !== process.env.ADMIN_UID) {
    console.warn('❌ [Admin Auth] UID não corresponde ao ADMIN_UID configurado.');
    throw new Error('Não autorizado');
  }
  return decoded;
}

// Converte Timestamps do Admin SDK para strings serializáveis.
function serialize(data) {
  if (!data || typeof data !== 'object') return data;
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => {
      if (v && typeof v.toDate === 'function') return [k, v.toDate().toISOString()];
      if (v && typeof v === 'object' && !Array.isArray(v)) return [k, serialize(v)];
      return [k, v];
    })
  );
}

// ─── checkAdminToken ──────────────────────────────────────────────────────────
// Retorna { ok: true } se o token for válido e pertencer ao admin.

export async function checkAdminToken(idToken) {
  try {
    await verifyAdmin(idToken);
    return { ok: true };
  } catch (err) {
    console.error('❌ [Admin Action] checkAdminToken falhou:', err.message);
    return { ok: false, error: err.message };
  }
}

// ─── getAllStores ─────────────────────────────────────────────────────────────

export async function getAllStores(idToken) {
  await verifyAdmin(idToken);
  const snap = await adminDb.collection('stores').orderBy('createdAt', 'desc').get();
  return snap.docs.map((d) => ({ id: d.id, ...serialize(d.data()) }));
}

// ─── createLojista ────────────────────────────────────────────────────────────
// Cria usuário no Firebase Auth + documento da loja + índice de slug.

export async function createLojista(idToken, formData) {
  await verifyAdmin(idToken);

  const { email, storeName, slug, phone, deliveryFee, minOrder } = formData;

  if (!/^[a-z0-9-]+$/.test(slug)) {
    throw new Error('Slug inválido. Use apenas letras minúsculas, números e hífens.');
  }

  const slugDoc = await adminDb.collection('slugs').doc(slug).get();
  if (slugDoc.exists) {
    throw new Error('Este slug já está em uso. Escolha outro.');
  }

  const tempPassword = generateTempPassword();

  const userRecord = await adminAuth.createUser({
    email,
    password: tempPassword,
    displayName: storeName,
  });

  // Generate a password reset link so the lojista can set their own password.
  // The client will call sendPasswordResetEmail() to dispatch it via Firebase.
  let resetLink = null;
  try {
    resetLink = await adminAuth.generatePasswordResetLink(email);
  } catch {
    // Non-fatal — client will still send a reset email after creation.
  }

  const storeRef  = adminDb.collection('stores').doc();
  const storeData = {
    name:        storeName,
    slug,
    ownerId:     userRecord.uid,
    phone:       phone || '',
    deliveryFee: parseFloat(deliveryFee) || 0,
    minOrder:    parseFloat(minOrder)    || 0,
    isOpen:      false,
    logoUrl:     null,
    bannerUrl:   null,
    description: '',
    address:     {},
    createdAt:   FieldValue.serverTimestamp(),
  };

  await storeRef.set(storeData);
  await adminDb.collection('slugs').doc(slug).set({ storeId: storeRef.id });

  return {
    id:          storeRef.id,
    uid:         userRecord.uid,
    name:        storeName,
    slug,
    email,
    phone:       phone || '',
    deliveryFee: parseFloat(deliveryFee) || 0,
    minOrder:    parseFloat(minOrder)    || 0,
    isOpen:      false,
    createdAt:   new Date().toISOString(),
    resetLink,   // null if generation failed; client falls back to sendPasswordResetEmail
  };
}

// ─── updateStore ──────────────────────────────────────────────────────────────

export async function updateStore(idToken, storeId, data) {
  await verifyAdmin(idToken);

  const allowed = ['name', 'phone', 'deliveryFee', 'minOrder', 'description', 'isOpen'];
  const filtered = Object.fromEntries(
    Object.entries(data).filter(([k]) => allowed.includes(k))
  );

  await adminDb.collection('stores').doc(storeId).update(filtered);
}
