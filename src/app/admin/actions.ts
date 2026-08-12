"use server";

import fs from "fs/promises";
import path from "path";

const SONGS_FILE_PATH = path.join(process.cwd(), "src/data/songs.json");

export interface Song {
  id: string;
  title: string;
  artist: string;
  youtubeUrl: string;
  spotifyUrl: string;
  ytMusicUrl: string;
  playlist: string;
}

// Fetch all songs
export async function getSongs(): Promise<Song[]> {
  try {
    const fileContent = await fs.readFile(SONGS_FILE_PATH, "utf-8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.warn("Failed to read songs database, returning empty list:", error);
    return [];
  }
}

// Add a new song
export async function addSongServer(
  title: string,
  artist: string,
  youtubeUrl: string,
  playlist: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Basic validation
    if (!title.trim() || !artist.trim() || !youtubeUrl.trim()) {
      return { success: false, error: "All fields are required" };
    }

    const songs = await getSongs();

    // Generate unique slug-like ID
    const baseId = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-");
    const uniqueId = `${baseId}-${Date.now()}`;

    const newSong: Song = {
      id: uniqueId,
      title: title.trim(),
      artist: artist.trim(),
      youtubeUrl: youtubeUrl.trim(),
      spotifyUrl: "",
      ytMusicUrl: "",
      playlist: playlist
    };

    songs.push(newSong);

    await fs.writeFile(SONGS_FILE_PATH, JSON.stringify(songs, null, 2), "utf-8");
    return { success: true };
  } catch (error: any) {
    console.warn("Error adding song:", error);
    return { success: false, error: error.message || "Failed to add song" };
  }
}

// Delete a song
export async function deleteSongServer(songId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const songs = await getSongs();
    const updatedSongs = songs.filter((song) => song.id !== songId);
    
    if (songs.length === updatedSongs.length) {
      return { success: false, error: "Song not found" };
    }

    await fs.writeFile(SONGS_FILE_PATH, JSON.stringify(updatedSongs, null, 2), "utf-8");
    return { success: true };
  } catch (error: any) {
    console.warn("Error deleting song:", error);
    return { success: false, error: error.message || "Failed to delete song" };
  }
}

// Secure Server-side Admin authentication check to keep credentials out of the client JS bundle
export async function authenticateAdmin(usernameInput: string, passwordInput: string): Promise<{ success: boolean }> {
  const isMatch = usernameInput === "raghu79" && passwordInput === "Rohit&Dhoni@123";
  return { success: isMatch };
}
