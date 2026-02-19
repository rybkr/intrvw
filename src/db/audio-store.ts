const AUDIO_ROOT_DIR = 'interview-audio';

async function getAudioDir(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(AUDIO_ROOT_DIR, { create: true });
}

/** Store a recorded audio blob, returns the storage key */
export async function storeAudio(
  interviewId: string,
  messageId: string,
  blob: Blob,
): Promise<string> {
  const dir = await getAudioDir();
  const key = `${interviewId}_${messageId}.webm`;
  const fileHandle = await dir.getFileHandle(key, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
  return key;
}

/** Retrieve audio blob for playback */
export async function getAudio(key: string): Promise<Blob | null> {
  try {
    const dir = await getAudioDir();
    const fileHandle = await dir.getFileHandle(key);
    return await fileHandle.getFile();
  } catch {
    return null;
  }
}

/** Delete audio for a specific interview */
export async function deleteInterviewAudio(
  interviewId: string,
): Promise<void> {
  const dir = await getAudioDir();
  for await (const [name] of (dir as any).entries()) {
    if (name.startsWith(interviewId + '_')) {
      await dir.removeEntry(name);
    }
  }
}

/** Delete all stored audio */
export async function clearAllAudio(): Promise<void> {
  const root = await navigator.storage.getDirectory();
  try {
    await root.removeEntry(AUDIO_ROOT_DIR, { recursive: true });
  } catch {
    // Directory may not exist
  }
}
