import { requireOptionalNativeModule } from "expo";
import type { DocumentFolder, MediaItem } from "../types/media";

export interface DeleteResult {
  deletedIds: string[];
  failures: { id: string; message: string }[];
}

interface DocumentLibraryModule {
  pickFolder(): Promise<DocumentFolder | null>;
  listDocuments(token: string): Promise<MediaItem[]>;
  openDocument(uri: string, token: string): Promise<void>;
  deleteDocuments(items: { id: string; uri: string; token: string }[]): Promise<DeleteResult>;
}

function nativeModule(): DocumentLibraryModule {
  const module = requireOptionalNativeModule<DocumentLibraryModule>("DocumentLibrary");
  if (!module) throw new Error("La sezione Documenti richiede il nuovo APK o una build iOS. Non e' disponibile in Expo Go.");
  return module;
}

export const pickDocumentFolder = () => nativeModule().pickFolder();
export const openDocument = (item: MediaItem) => nativeModule().openDocument(item.uri, item.folderToken ?? "");

export async function listDocuments(folders: DocumentFolder[]): Promise<MediaItem[]> {
  const found = new Map<string, MediaItem>();
  for (const folder of folders) {
    const items = await nativeModule().listDocuments(folder.token);
    for (const item of items) found.set(item.id, { ...item, mediaType: "document", folderToken: folder.token });
  }
  return [...found.values()].sort((a, b) => b.creationTime - a.creationTime || a.id.localeCompare(b.id));
}

export function deleteDocuments(items: MediaItem[]): Promise<DeleteResult> {
  return nativeModule().deleteDocuments(items.map((item) => ({ id: item.id, uri: item.uri, token: item.folderToken ?? "" })));
}
