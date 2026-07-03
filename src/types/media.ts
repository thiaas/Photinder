export type MediaType = "photo" | "video";

export interface MediaItem {
  id: string;
  uri: string;
  filename: string;
  mediaType: MediaType;
  creationTime: number;
  albumId?: string;
}

export interface SessionState {
  id: string;
  startDate: number;
  currentIndex: number;
  lastAnalyzedId: string | null;
  lastAnalyzedCreationTime: number | null;
  trash: MediaItem[];
  totalCount: number;
  createdAt: number;
  updatedAt: number;
}
