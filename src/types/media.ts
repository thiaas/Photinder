export type MediaType = "photo" | "video" | "document";
export type LibraryKind = "photos" | "documents";

export interface DocumentFolder {
  token: string;
  name: string;
}

export interface MediaItem {
  id: string;
  uri: string;
  filename: string;
  mediaType: MediaType;
  creationTime: number;
  albumId?: string;
  folderToken?: string;
  mimeType?: string;
  size?: number;
}

export interface SessionState {
  id: string;
  kind: LibraryKind;
  name: string;
  folders: DocumentFolder[];
  startDate: number;
  currentIndex: number;
  lastAnalyzedId: string | null;
  lastAnalyzedCreationTime: number | null;
  trash: MediaItem[];
  totalCount: number;
  createdAt: number;
  updatedAt: number;
}
