import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  UploadTask
} from 'firebase/storage';
import { storage } from './config';

export interface UploadProgress {
  progress: number;
  state: 'running' | 'paused' | 'success' | 'error';
}

export function uploadFile(
  file: File,
  path: string,
  onProgress?: (progress: UploadProgress) => void
): UploadTask {
  const storageRef = ref(storage, path);
  const uploadTask = uploadBytesResumable(storageRef, file);

  if (onProgress) {
    uploadTask.on('state_changed', (snapshot) => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      onProgress({
        progress,
        state: snapshot.state as 'running' | 'paused'
      });
    });
  }

  return uploadTask;
}

export async function getFileDownloadURL(path: string): Promise<string> {
  const storageRef = ref(storage, path);
  return getDownloadURL(storageRef);
}

/**
 * Upload a resource file (lesson recording, guide, notes) for a specific student
 * @param file The file to upload
 * @param tutorId The tutor's UID
 * @param studentId The student's UID
 * @param onProgress Optional progress callback
 * @returns The download URL of the uploaded file
 */
export async function uploadResourceFile(
  file: File,
  tutorId: string,
  studentId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<string> {
  const timestamp = Date.now();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `tutor-resources/${tutorId}/${studentId}/${timestamp}_${sanitizedFileName}`;

  const uploadTask = uploadFile(file, path, onProgress);
  await uploadTask;

  return await getFileDownloadURL(path);
}
