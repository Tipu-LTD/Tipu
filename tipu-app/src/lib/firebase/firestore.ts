import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  DocumentData,
  Query,
  Unsubscribe
} from 'firebase/firestore';
import { db } from './config';

export function listenToCollection<T = DocumentData>(
  collectionPath: string,
  constraints: any[],
  callback: (data: T[]) => void
): Unsubscribe {
  const collectionRef = collection(db, collectionPath);
  const q = query(collectionRef, ...constraints) as Query<T>;

  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as T[];
    callback(data);
  });
}

export { collection, query, where, orderBy, onSnapshot };
