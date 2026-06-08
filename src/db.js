import { db } from "./firebase";
import {
  doc, getDoc, setDoc, collection, onSnapshot, updateDoc, serverTimestamp,
} from "firebase/firestore";

export async function getConfig(name, fallback) {
  try {
    const snap = await getDoc(doc(db, "config", name));
    return snap.exists() ? snap.data() : fallback;
  } catch {
    return fallback;
  }
}

export const setConfigItems = async (name, items) => {
  try {
    await setDoc(doc(db, "config", name), { items }, { merge: true });
  } catch {}
};

export const setSettings = async (patch) => {
  try {
    await setDoc(doc(db, "config", "settings"), patch, { merge: true });
  } catch {}
};

export function subscribeOrders(cb) {
  try {
    return onSnapshot(collection(db, "orders"), (qs) =>
      cb(
        qs.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort(
            (a, b) =>
              (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
          )
      ),
      () => cb([])
    );
  } catch {
    cb([]);
    return () => {};
  }
}

export const createOrder = async (order) => {
  try {
    await setDoc(doc(db, "orders", order.id), {
      ...order,
      createdAt: serverTimestamp(),
    });
  } catch {}
};

export const patchOrder = async (id, patch) => {
  try {
    await updateDoc(doc(db, "orders", id), patch);
  } catch {}
};
