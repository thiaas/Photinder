import { createContext, useContext } from "react";
import type { LibraryKind } from "../types/media";

export const libraryColors: Record<LibraryKind, string> = { photos: "#1670d2", documents: "#cf2929" };
export const LibraryTheme = createContext(libraryColors.photos);
export const useLibraryColor = () => useContext(LibraryTheme);
