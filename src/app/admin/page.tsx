"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  Music, 
  Trash2, 
  Plus, 
  LogOut, 
  Radio, 
  Lock,
  User,
  Compass,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { getSongs, addSongServer, deleteSongServer, authenticateAdmin, Song } from "./actions";
import { getYouTubeId } from "../../utils/youtube";

const PLAYLISTS = [
  { id: "all", name: "All Routes", desc: "The complete Jammu Matador cassette collection" }
];

export default function AdminPage() {
  const router = useRouter();
  
  // Auth state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(true);

  // Songs state
  const [songs, setSongs] = useState<Song[]>([]);
  const [formTitle, setFormTitle] = useState("");
  const [formArtist, setFormArtist] = useState("");
  const [formYoutubeUrl, setFormYoutubeUrl] = useState("");
  const [formPlaylist, setFormPlaylist] = useState("all");
  
  // Message states
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sessionAuth = sessionStorage.getItem("matador_auth");
      if (sessionAuth === "true") {
        setIsAuthenticated(true);
        fetchSongs();
      }
      setAuthLoading(false);
    }
  }, []);

  const fetchSongs = async () => {
    const songList = await getSongs();
    setSongs(songList);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    try {
      const result = await authenticateAdmin(username, password);
      if (result.success) {
        setIsAuthenticated(true);
        sessionStorage.setItem("matador_auth", "true");
        fetchSongs();
      } else {
        setAuthError("Incorrect username or password. Access Denied.");
      }
    } catch (err) {
      setAuthError("Authentication system error. Please try again.");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem("matador_auth");
    setUsername("");
    setPassword("");
  };

  const handleAddSong = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");
    
    // Validation
    if (!formTitle.trim() || !formArtist.trim() || !formYoutubeUrl.trim()) {
      setErrorMsg("All fields are required.");
      return;
    }

    // YouTube video ID check (also extracts from iframe tags)
    const videoId = getYouTubeId(formYoutubeUrl.trim());
    if (!videoId) {
      setErrorMsg("Please enter a valid YouTube URL or iframe embed code.");
      return;
    }

    setActionLoading(true);
    const result = await addSongServer(
      formTitle.trim(),
      formArtist.trim(),
      formYoutubeUrl.trim(),
      formPlaylist
    );
    setActionLoading(false);

    if (result.success) {
      setSuccessMsg(`Successfully added "${formTitle}" to playlist!`);
      setFormTitle("");
      setFormArtist("");
      setFormYoutubeUrl("");
      fetchSongs();
    } else {
      setErrorMsg(result.error || "Failed to add song.");
    }
  };

  const handleDeleteSong = async (songId: string, title: string) => {
    if (!confirm(`Are you sure you want to eject "${title}" from the stereo cassette rack?`)) {
      return;
    }

    setActionLoading(true);
    const result = await deleteSongServer(songId);
    setActionLoading(false);

    if (result.success) {
      setSuccessMsg(`Successfully removed "${title}"!`);
      fetchSongs();
    } else {
      setErrorMsg(result.error || "Failed to delete song.");
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#050508] text-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin w-8 h-8 border-2 border-[#00ff66] border-t-transparent rounded-full" />
          <span className="text-xs text-white/40 tracking-widest font-mono">LOADING CONSOLE...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex flex-col text-white overflow-x-hidden font-sans">
      
      {/* Blurred background matching main player */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 ease-out scale-105"
        style={{ 
          backgroundImage: "url('/images/jammu_matadoor_art.png')",
          filter: "blur(35px) brightness(0.15)"
        }}
      />

      {/* ------------------- LOGIN VIEW ------------------- */}
      {!isAuthenticated ? (
        <div className="relative z-10 flex-grow flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel p-6 md:p-8 rounded-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
            
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-[#ff3366]/10 border border-[#ff3366]/30 text-[#ff3366] rounded-full flex items-center justify-center mx-auto mb-3 shadow-[0_0_15px_rgba(255,51,102,0.2)]">
                <Lock className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold tracking-wide">CABIN CREW ONLY</h1>
              <p className="text-xs text-white/40 mt-1">Authenticate to access Jammu Matador stereo deck</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-white/50 tracking-wider uppercase mb-1.5 font-mono">
                  Driver Username
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-3 w-4 h-4 text-white/30" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-[#00ff66] transition-colors font-mono"
                    placeholder="Username"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-white/50 tracking-wider uppercase mb-1.5 font-mono">
                  Access Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3 w-4 h-4 text-white/30" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-[#00ff66] transition-colors font-mono"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {authError && (
                <div className="flex items-center gap-2 bg-[#ff3366]/10 border border-[#ff3366]/20 text-[#ff3366] p-3 rounded-lg text-xs font-medium">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full mt-2 bg-gradient-to-r from-[#ff3366] to-[#ff5e3a] hover:from-[#ff5e3a] hover:to-[#ff3366] text-white py-2.5 rounded-lg text-sm font-bold tracking-wide transition-all shadow-[0_0_15px_rgba(255,51,102,0.2)] cursor-pointer"
              >
                Log In to Deck
              </button>

              <button
                type="button"
                onClick={() => router.push("/")}
                className="w-full border border-white/10 hover:bg-white/5 text-white/60 hover:text-white py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Radio className="w-3.5 h-3.5" /> Back to Radio
              </button>
            </form>
          </div>
        </div>
      ) : (
        // ------------------- ADMIN CONSOLE VIEW -------------------
        <div className="relative z-10 w-full flex-grow flex flex-col p-4 md:p-8">
          
          {/* Header */}
          <header className="w-full max-w-6xl mx-auto glass-panel p-4 md:p-5 rounded-2xl border border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#00ff66]/10 border border-[#00ff66]/30 text-[#00ff66] rounded-xl shadow-[0_0_10px_rgba(0,255,102,0.2)]">
                <Music className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-md font-bold tracking-wide">JAMMU MATADOR STEREO DECK</h1>
                <p className="text-[10px] text-white/40 tracking-wider font-mono">ADMIN CONTROL PANEL</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push("/")}
                className="flex items-center gap-1.5 bg-white/5 border border-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-bold py-2 px-4 rounded-lg cursor-pointer transition-all"
              >
                <Radio className="w-4 h-4 text-[#00ff66]" /> Go to Radio
              </button>
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 bg-[#ff3366]/10 border border-[#ff3366]/20 hover:bg-[#ff3366]/20 text-[#ff3366] text-xs font-bold py-2 px-4 rounded-lg cursor-pointer transition-all"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </header>

          <main className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-grow">
            
            {/* LEFT SIDE: ADD SONG FORM */}
            <div className="lg:col-span-5 glass-panel p-6 rounded-2xl border border-white/10 shadow-2xl flex flex-col">
              <h2 className="text-sm font-bold tracking-wider uppercase text-[#00ff66] mb-4 flex items-center gap-1.5 font-mono border-b border-white/5 pb-2.5">
                <Plus className="w-4.5 h-4.5" /> Eject New Cassette In Deck
              </h2>

              <form onSubmit={handleAddSong} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-white/50 tracking-wider uppercase mb-1.5 font-mono">
                    Track Title
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-[#00ff66] transition-colors"
                    placeholder="e.g. Khand Mithe Log Dogre"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/50 tracking-wider uppercase mb-1.5 font-mono">
                    Artist / Singer
                  </label>
                  <input
                    type="text"
                    required
                    value={formArtist}
                    onChange={(e) => setFormArtist(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-[#00ff66] transition-colors"
                    placeholder="e.g. Harish"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-white/50 tracking-wider uppercase mb-1.5 font-mono">
                    YouTube URL or Iframe Embed Code
                  </label>
                  <input
                    type="text"
                    required
                    value={formYoutubeUrl}
                    onChange={(e) => setFormYoutubeUrl(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-[#00ff66] transition-colors font-mono"
                    placeholder="YouTube link OR iframe embed tag <iframe>..."
                  />
                  <p className="text-[9px] text-white/30 mt-1 font-mono leading-normal">
                    * Paste standard YouTube links or direct iframe HTML code.
                  </p>
                </div>

                {successMsg && (
                  <div className="flex items-center gap-2 bg-[#00ff66]/10 border border-[#00ff66]/20 text-[#00ff66] p-3 rounded-lg text-xs font-semibold animate-pulse">
                    <CheckCircle2 className="w-4.5 h-4.5 flex-shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {errorMsg && (
                  <div className="flex items-center gap-2 bg-[#ff3366]/10 border border-[#ff3366]/20 text-[#ff3366] p-3 rounded-lg text-xs font-semibold">
                    <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full bg-[#00ff66] text-black hover:bg-white font-bold py-2.5 rounded-lg text-xs uppercase tracking-widest transition-all cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? "Writing to Tape..." : "Register Track in Deck"}
                </button>
              </form>
            </div>

            {/* RIGHT SIDE: CURRENT SONGS LIST */}
            <div className="lg:col-span-7 glass-panel p-6 rounded-2xl border border-white/10 shadow-2xl flex flex-col h-[75vh]">
              <h2 className="text-sm font-bold tracking-wider uppercase text-[#ff3366] mb-4 flex items-center gap-1.5 font-mono border-b border-white/5 pb-2.5">
                <Music className="w-4.5 h-4.5" /> Currently Loaded Cassettes ({songs.length} Tracks)
              </h2>

              <div className="flex-grow overflow-y-auto pr-1 space-y-2.5 scrollbar-thin">
                {songs.map((song, i) => (
                  <div 
                    key={song.id}
                    className="flex items-center justify-between p-3 bg-black/40 border border-white/5 hover:border-white/10 rounded-xl transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-4">
                      <span className="text-xs text-white/30 font-mono w-5">{(i + 1).toString().padStart(2, "0")}</span>
                      <div className="truncate">
                        <p className="font-bold text-sm truncate">{song.title}</p>
                        <p className="text-xs text-white/40 truncate font-semibold">{song.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-white/35 px-2 py-0.5 bg-white/5 rounded border border-white/5 hidden sm:inline-block font-mono">
                        {PLAYLISTS.find(p => p.id === song.playlist)?.name.split(" ")[0]}
                      </span>

                      <button
                        onClick={() => handleDeleteSong(song.id, song.title)}
                        className="p-1.5 hover:bg-[#ff3366]/10 border border-transparent hover:border-[#ff3366]/20 text-white/40 hover:text-[#ff3366] rounded-lg transition-all cursor-pointer"
                        title="Delete track"
                      >
                        <Trash2 className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
