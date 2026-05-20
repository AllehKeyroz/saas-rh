import { storage } from './config'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

export async function uploadFile({ file, path }) {
  const filePath = path || `uploads/${Date.now()}_${file.name}`
  const storageRef = ref(storage, filePath)
  const snapshot = await uploadBytes(storageRef, file)
  const fileUrl = await getDownloadURL(snapshot.ref)
  return { file_url: fileUrl, file_path: filePath }
}

export async function getFileUrl(filePath) {
  const storageRef = ref(storage, filePath)
  return getDownloadURL(storageRef)
}
