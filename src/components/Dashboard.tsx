"use client";

import { useState, useEffect } from "react";
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX, 
  List, 
  Music, 
  Clock, 
  Share2, 
  X,
  Compass,
  Repeat,
  Repeat1
} from "lucide-react";
import songsData from "../data/songs.json";
import { getYouTubeId } from "../utils/youtube";
import { getSongs, Song } from "../app/admin/actions";

const PLAYLISTS = [
  { id: "all", name: "All Routes", desc: "The complete Jammu Matadoor cassette collection" }
];

const ROUTES = [
  "Janipur to Bari Brahmana",
  "Parade to Talab Tillo",
  "Channi Himmat to Kachi Chawni",
  "R.S. Pura to General Bus Stand",
  "Nanak Nagar to Parade Ground"
];

const DRIVER_STATES = [
  "Racing another Matadoor! (BASS BOOSTED)",
  "Collecting passengers at Jewel Chowk",
  "Overloaded (15 standing on footboard)",
  "Cruising over Tawi Bridge",
  "Taking a quick Chai break under flyover"
];

export default function Dashboard() {
  // Mounting status to prevent Hydration Mismatch
  const [mounted, setMounted] = useState<boolean>(false);

  // Songs state
  const [songs, setSongs] = useState<Song[]>(songsData as Song[]);
  const [activePlaylistId, setActivePlaylistId] = useState<string>("all");
  const [activeSongIndex, setActiveSongIndex] = useState<number>(0);
  
  // Player control state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(75);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [prevVolume, setPrevVolume] = useState<number>(75);
  const [playerError, setPlayerError] = useState<string | null>(null);

  // Parallax motion offset state
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  // Simulated metrics state
  const [passengerCount, setPassengerCount] = useState<number>(28);
  const [activeRoute, setActiveRoute] = useState<string>(ROUTES[0]);
  const [driverState, setDriverState] = useState<string>(DRIVER_STATES[0]);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>("");
  const [currentDateStr, setCurrentDateStr] = useState<string>("");
  const [isLoopPlaylist, setIsLoopPlaylist] = useState<boolean>(true);
  const [isRepeatTrack, setIsRepeatTrack] = useState<boolean>(false);

  // Modals & Popups
  const [isAllSongsOpen, setIsAllSongsOpen] = useState<boolean>(false);
  const [shareToast, setShareToast] = useState<boolean>(false);

  // Set mounted on client load
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch dynamic songs on mount
  useEffect(() => {
    const fetchDynamicSongs = async () => {
      try {
        const freshSongs = await getSongs();
        if (freshSongs && freshSongs.length > 0) {
          setSongs(freshSongs);
        }
      } catch (err) {
        console.warn("Could not load dynamic songs list:", err);
      }
    };
    fetchDynamicSongs();
  }, []);

  // Mouse Parallax Motion Effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth) - 0.5;
      const y = (e.clientY / innerHeight) - 0.5;
      setMouseOffset({
        x: x * -25,
        y: y * -25
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Filtered playlist songs
  const filteredSongs = activePlaylistId === "all" 
    ? songs 
    : songs.filter(s => s.playlist === activePlaylistId);

  const activeSong = filteredSongs[activeSongIndex] || songs[0];
  const activeYTId = activeSong ? getYouTubeId(activeSong.youtubeUrl) : "";

  // 1. YouTube Message Listener Hook: Receive updates from YT iframe
  useEffect(() => {
    if (typeof window === "undefined" || !activeYTId) return;

    const handleYTMessage = (e: MessageEvent) => {
      if (!e.origin.includes("youtube.com")) return;

      try {
        const data = typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        
        if (data.event === "infoDelivery" && data.info) {
          if (data.info.currentTime !== undefined) {
            setCurrentTime(data.info.currentTime);
          }
          if (data.info.duration !== undefined) {
            setDuration(data.info.duration);
          }
          if (data.info.playerState !== undefined) {
            const state = data.info.playerState;
            if (state === 0) {
              handleNext();
            } else if (state === 1) {
              setIsPlaying(true);
            } else if (state === 2) {
              setIsPlaying(false);
            }
          }
        }
        
        if (data.event === "onStateChange") {
          const state = data.info;
          if (state === 0) {
            handleNext();
          } else if (state === 1) {
            setIsPlaying(true);
          } else if (state === 2) {
            setIsPlaying(false);
          }
        }
      } catch (err) {
        // Ignored
      }
    };

    window.addEventListener("message", handleYTMessage);
    return () => window.removeEventListener("message", handleYTMessage);
  }, [filteredSongs, activeSongIndex, activeSong, activeYTId]);

  // 2. Play/Pause State Sync: Send commands to the iframe
  useEffect(() => {
    if (!mounted || !activeYTId) return;

    const iframe = document.getElementById("stereo-youtube-iframe") as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      try {
        const command = isPlaying ? "playVideo" : "pauseVideo";
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: command, args: "" }),
          "*"
        );
      } catch (e) {}
    }
  }, [isPlaying, activeSongIndex, activePlaylistId, mounted, activeYTId]);

  // 3. Volume Sync Hook: Sync control deck volume to iframe
  useEffect(() => {
    if (!mounted || !activeYTId) return;

    const iframe = document.getElementById("stereo-youtube-iframe") as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: "setVolume", args: [isMuted ? 0 : volume] }),
          "*"
        );
      } catch (e) {}
    }
  }, [volume, isMuted, activeSongIndex, mounted, activeYTId]);

  // 4. Handshake Hook: Initialize YouTube iframe JS API callbacks
  useEffect(() => {
    if (!mounted || !activeYTId) return;
    const iframe = document.getElementById("stereo-youtube-iframe") as HTMLIFrameElement;
    if (!iframe || !iframe.contentWindow) return;

    const timeout = setTimeout(() => {
      try {
        iframe.contentWindow?.postMessage(
          JSON.stringify({ event: "listening", id: 1, channel: "widget" }),
          "*"
        );
        iframe.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "setVolume", args: [volume] }),
          "*"
        );
      } catch (e) {}
    }, 1200);

    return () => clearTimeout(timeout);
  }, [activeYTId, activeSongIndex, mounted]);

  // Reset progress when track changes
  useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
  }, [activeSongIndex]);

  // Update clock in Jammu time (IST)
  useEffect(() => {
    const updateTime = () => {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      };
      const dateOptions: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Kolkata",
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      };
      
      const kolkataTime = new Date().toLocaleTimeString("en-US", options);
      const kolkataDate = new Date().toLocaleDateString("en-US", dateOptions);
      
      setCurrentTimeStr(kolkataTime);
      setCurrentDateStr(kolkataDate);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Simulate Jammu Matadoor ecosystem (Passengers and Driver status)
  useEffect(() => {
    const interval = setInterval(() => {
      setPassengerCount(prev => {
        const change = Math.floor(Math.random() * 5) - 2;
        const next = prev + change;
        return Math.max(5, Math.min(55, next));
      });

      if (Math.random() > 0.6) {
        setDriverState(DRIVER_STATES[Math.floor(Math.random() * DRIVER_STATES.length)]);
      }
    }, 7000);

    return () => clearInterval(interval);
  }, []);

  // Handle Play/Pause keyboard shortcut (Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Player controls
  const handlePlayPause = () => {
    setIsPlaying(prev => !prev);
  };

  const seekToZeroAndPlay = () => {
    const iframe = document.getElementById("stereo-youtube-iframe") as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: "seekTo", args: [0, true] }),
          "*"
        );
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: "playVideo", args: "" }),
          "*"
        );
      } catch (e) {}
    }
    setCurrentTime(0);
    setIsPlaying(true);
  };

  const handleNext = () => {
    if (filteredSongs.length === 0) return;
    
    if (isRepeatTrack) {
      seekToZeroAndPlay();
      return;
    }

    const nextIndex = activeSongIndex + 1;
    if (nextIndex >= filteredSongs.length) {
      if (isLoopPlaylist) {
        setActiveSongIndex(0);
        setCurrentTime(0);
        setIsPlaying(true);
        setPlayerError(null);
      } else {
        setIsPlaying(false);
      }
    } else {
      setActiveSongIndex(nextIndex);
      setCurrentTime(0);
      setIsPlaying(true);
      setPlayerError(null);
    }
  };

  const handlePrev = () => {
    if (filteredSongs.length === 0) return;

    if (isRepeatTrack) {
      seekToZeroAndPlay();
      return;
    }

    const prevIndex = activeSongIndex - 1;
    if (prevIndex < 0) {
      if (isLoopPlaylist) {
        setActiveSongIndex(filteredSongs.length - 1);
        setCurrentTime(0);
        setIsPlaying(true);
        setPlayerError(null);
      } else {
        setIsPlaying(false);
      }
    } else {
      setActiveSongIndex(prevIndex);
      setCurrentTime(0);
      setIsPlaying(true);
      setPlayerError(null);
    }
  };

  const handleMuteToggle = () => {
    if (isMuted) {
      setVolume(prevVolume);
      setIsMuted(false);
    } else {
      setPrevVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setVolume(val);
    if (val > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const selectSong = (index: number) => {
    setActiveSongIndex(index);
    setCurrentTime(0);
    setIsPlaying(true);
    setIsAllSongsOpen(false);
    setPlayerError(null);
  };

  const handlePlaylistChange = (playlistId: string) => {
    setActivePlaylistId(playlistId);
    setActiveSongIndex(0);
    setCurrentTime(0);
    setIsPlaying(true);
    setPlayerError(null);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setShareToast(true);
      setTimeout(() => setShareToast(false), 3000);
    }
  };

  return (
    <main className="relative min-h-screen w-full flex flex-col justify-between text-white overflow-hidden font-sans select-none">
      
      {/* Background Painting - Interactive Parallax Motion Graphics */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat ease-out"
        style={{ 
          backgroundImage: "url('/images/jammu_matadoor_art.png')",
          filter: "brightness(0.35) contrast(1.05) saturate(0.95)",
          transform: `scale(1.1) translate3d(${mouseOffset.x}px, ${mouseOffset.y}px, 0)`,
          transition: "transform 0.25s cubic-bezier(0.1, 0.8, 0.3, 1)"
        }}
      />
      
      {/* Dark vignette overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#0a0a0d]/50 pointer-events-none" />

      {/* ------------------- HEADER ------------------- */}
      <header className="relative z-10 w-full p-4 md:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        
        {/* Left Side: Clock, simulated passengers, status */}
        <div className="flex flex-col gap-1.5 glass-panel p-4 rounded-xl border border-white/5 backdrop-blur-md shadow-2xl">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff66] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00ff66]"></span>
            </span>
            <span className="text-sm font-semibold tracking-wider text-[#00ff66]">
              {passengerCount} PASSENGERS ON BOARD
            </span>
          </div>
          
          <div className="flex flex-col mt-1">
            <span className="text-2xl font-bold tracking-tight text-white/90 tabular-nums">
              {currentTimeStr || "00:00:00 PM"}
            </span>
            <span className="text-xs text-white/50 tracking-wide uppercase font-medium">
              {currentDateStr || "Wednesday, 12 August - Jammu Local Time"}
            </span>
          </div>

          <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-white/5">
            <span className="text-[9px] uppercase font-bold tracking-widest text-[#00ff66]">
              SELECT ROUTE
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Compass className="w-3.5 h-3.5 text-[#ff3366] flex-shrink-0" />
              <select
                value={activeRoute}
                onChange={(e) => setActiveRoute(e.target.value)}
                className="bg-transparent text-xs font-semibold text-white/80 border-0 focus:ring-0 focus:outline-none cursor-pointer hover:text-[#00ff66] transition-colors p-0 m-0"
                style={{ WebkitAppearance: "none", appearance: "none" }}
              >
                {ROUTES.map((route) => (
                  <option key={route} value={route} className="bg-[#121217] text-white">
                    {route}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Right Side: Built credit and share */}
        <div className="flex items-center gap-3">
          <div className="glass-panel text-xs text-white/60 py-2 px-4 rounded-lg border border-white/5 flex items-center gap-1.5 flex-wrap">
            <span>Built by</span>
            <a 
              href="https://x.com/raghu__79"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#00ff66] hover:underline font-bold transition-colors"
            >
              Raghunandan
            </a>
            <a 
              href="https://x.com/lazyydevv"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/40 hover:text-[#00ff66] transition-colors text-[10px] font-mono"
            >
              (@lazyydevv)
            </a>
            <span className="text-white/20 mx-1">|</span>
            <button 
              onClick={handleShare}
              className="hover:text-white transition-colors flex items-center gap-1 cursor-pointer font-semibold"
            >
              <Share2 className="w-3 h-3 text-[#00ff66]" /> Share Cabin Link
            </button>
          </div>
        </div>
      </header>

      {/* ------------------- MIDDLE HERO ------------------- */}
      <section className="relative z-10 flex-grow flex flex-col justify-center items-center px-4 py-8">
        
        {/* Large Title overlay - Matches reference saloon aesthetics */}
        <div className="text-center select-none pointer-events-none mb-4">
          <div className="inline-block bg-[#00ff66]/10 border border-[#00ff66]/20 px-3.5 py-1.5 rounded-full text-[10px] font-bold tracking-widest text-[#00ff66] uppercase mb-4">
            ALL ROUTES
          </div>
          <h1 className="text-4xl sm:text-6xl md:text-8xl font-black font-sans text-transparent bg-clip-text bg-gradient-to-b from-white via-white/80 to-white/30 drop-shadow-[0_6px_16px_rgba(0,0,0,0.9)] tracking-wider">
            JAMMU MATADOOR
          </h1>
          <p className="text-xs md:text-sm font-bold tracking-[0.3em] text-[#ff3366] uppercase mt-2 drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
            JAMMU MATADOOR RADIO · PLAYING LIVE
          </p>
        </div>

        {/* Floating status message */}
        <div className="bg-black/55 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/5 text-[11px] font-mono text-white/70 tracking-wider">
          STATUS: <span className="text-[#00ff66] font-bold">{driverState}</span>
        </div>

        {/* Playlist description subtitle */}
        <p className="text-xs text-white/40 mt-4 max-w-md text-center italic tracking-wider">
          &ldquo;{PLAYLISTS.find(p => p.id === activePlaylistId)?.desc}&rdquo;
        </p>
      </section>

      {/* ------------------- BOTTOM STEREO DECK (WITH EMBEDDED VISIBLE IFRAME) ------------------- */}
      <footer className="relative z-10 w-full p-4 md:p-6 max-w-5xl mx-auto mb-4">
        
        {/* Outer glassmorphic border for the Pioneer Stereo Deck */}
        <div className="glass-panel rounded-2xl md:rounded-3xl border border-white/10 p-4 md:p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-lg flex flex-col md:flex-row gap-5 items-center justify-between">
          
          {/* LEFT SECTION: Visible YouTube Embed Iframe & Song Metadata */}
          <div className="w-full md:w-1/2 flex flex-col sm:flex-row items-center gap-4 bg-black/60 border border-white/5 rounded-xl p-3 relative overflow-hidden shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)]">
            
            {/* The literal YouTube Iframe Player, styled as a car stereo dashboard television */}
            <div className="w-full aspect-video sm:aspect-none sm:w-36 sm:h-20 bg-black rounded-lg border border-white/15 overflow-hidden flex-shrink-0 relative shadow-[0_4px_15px_rgba(0,0,0,0.6)]">
              {playerError ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-black/90 p-2 text-center font-mono">
                  <span className="text-[#ff3366] text-[10px] font-bold animate-pulse">⚠️ ERROR_150</span>
                  <span className="text-[7px] text-white/40 mt-1 uppercase">Restricted Embed</span>
                </div>
              ) : !mounted ? (
                <div className="w-full h-full flex items-center justify-center text-[9px] text-[#00ff66] font-mono animate-pulse">
                  TUNING STEREO...
                </div>
              ) : activeYTId ? (
                <iframe
                  id="stereo-youtube-iframe"
                  src={`https://www.youtube.com/embed/${activeYTId}?enablejsapi=1&autoplay=1&controls=1&rel=0&modestbranding=1&origin=${typeof window !== "undefined" ? window.location.origin : ""}`}
                  className="w-full h-full border-0"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[10px] text-white/20 font-mono">
                  NO SIGNAL
                </div>
              )}
            </div>

            {/* Visualizer and Track Details */}
            <div className="flex-grow min-w-0 flex items-center gap-3 w-full sm:w-auto">
              
              {/* Visualizer bars */}
              <div className="flex items-end gap-0.5 h-8 w-6 flex-shrink-0">
                {[...Array(5)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`w-1 rounded-t bg-[#00ff66] transition-all`}
                    style={{
                      height: isPlaying ? `${Math.floor(Math.random() * 85) + 15}%` : "15%",
                      animationName: isPlaying ? "bounce" : "none",
                      animationDuration: isPlaying ? `1.${i + 2}s` : "0s",
                      animationTimingFunction: "ease-in-out",
                      animationIterationCount: "infinite",
                      animationDirection: "alternate",
                      animationDelay: `${i * 0.15}s`
                    }}
                  />
                ))}
              </div>

              {/* Metadata */}
              <div className="flex-grow min-w-0">
                <span className="text-[#00ff66] font-semibold tracking-widest uppercase text-[8px] font-mono block mb-0.5">
                  Stereo Channel
                </span>
                <h3 className="text-xs font-bold text-white/90 truncate leading-snug">
                  {activeSong?.title || "No track loaded"}
                </h3>
                <p className="text-[10px] text-white/40 truncate font-semibold">
                  {activeSong?.artist || "Unknown artist"}
                </p>
              </div>

              {/* Quick Playlist List button */}
              <button 
                onClick={() => setIsAllSongsOpen(true)}
                className="p-1.5 hover:bg-white/5 rounded-lg border border-white/5 hover:text-[#00ff66] transition-colors cursor-pointer flex-shrink-0"
                title="Show cassette list"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* RIGHT SECTION: Controls, Seekbar, Volume */}
          <div className="w-full md:w-1/2 flex flex-col gap-3 justify-center">
            
            {/* Upper: Prev, Play/Pause, Next & Volume Bar */}
            <div className="flex items-center justify-between sm:justify-end gap-5">
              
              {/* Audio Controls */}
              <div className="flex items-center gap-2.5">
                <button 
                  onClick={() => setIsLoopPlaylist(prev => !prev)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isLoopPlaylist 
                      ? "text-[#00ff66] hover:text-white" 
                      : "text-white/20 hover:text-white"
                  }`}
                  title={isLoopPlaylist ? "Loop Playlist: ON" : "Loop Playlist: OFF"}
                >
                  <Repeat className="w-4 h-4" />
                </button>

                <button 
                  onClick={handlePrev}
                  className="p-1.5 text-white/60 hover:text-[#00ff66] transition-colors cursor-pointer transform active:scale-95"
                  title="Previous Track"
                >
                  <SkipBack className="w-4.5 h-4.5" />
                </button>

                <button 
                  onClick={handlePlayPause}
                  className="w-10 h-10 rounded-full bg-white text-black hover:bg-[#00ff66] hover:text-black flex items-center justify-center transition-all cursor-pointer transform active:scale-95 shadow-[0_0_12px_rgba(255,255,255,0.2)]"
                  title="Play/Pause"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </button>

                <button 
                  onClick={handleNext}
                  className="p-1.5 text-white/60 hover:text-[#00ff66] transition-colors cursor-pointer transform active:scale-95"
                  title="Next Track"
                >
                  <SkipForward className="w-4.5 h-4.5" />
                </button>

                <button 
                  onClick={() => setIsRepeatTrack(prev => !prev)}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isRepeatTrack 
                      ? "text-[#00ff66] hover:text-white" 
                      : "text-white/20 hover:text-white"
                  }`}
                  title={isRepeatTrack ? "Repeat Track: ON" : "Repeat Track: OFF"}
                >
                  <Repeat1 className="w-4 h-4" />
                </button>
              </div>

              {/* Volume Slider */}
              <div className="flex items-center gap-2 bg-white/5 border border-white/5 px-2.5 py-1.5 rounded-lg w-full max-w-[130px] sm:max-w-none">
                <button 
                  onClick={handleMuteToggle}
                  className="text-white/60 hover:text-white transition-colors cursor-pointer flex-shrink-0"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-3.5 h-3.5 text-[#ff3366]" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-[#00ff66]" />
                  )}
                </button>
                <input 
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-full accent-[#00ff66] h-1 bg-white/10 rounded-lg cursor-pointer"
                />
              </div>
            </div>

            {/* Lower: Seekbar and Timer */}
            <div className="w-full flex items-center gap-3">
              <span className="text-[10px] text-white/40 font-mono w-8 text-right">
                {formatTime(currentTime)}
              </span>
              
              <div className="relative flex-grow h-1 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="absolute top-0 left-0 h-full bg-[#00ff66] shadow-[0_0_10px_rgba(0,255,102,0.8)] transition-all duration-300"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>

              <span className="text-[10px] text-white/40 font-mono w-8">
                {formatTime(duration)}
              </span>
            </div>
          </div>
        </div>

        {/* Legal and compliance disclaimer */}
        <div className="text-center text-[10px] text-white/30 mt-3 max-w-xl mx-auto leading-relaxed">
          Audio is streamed live via YouTube API. All rights belong to respective composers and labels. No media is hosted on this server. Playlists are curated by local Jammu crews.
        </div>
      </footer>

      {/* ------------------- MODAL: CASSETTE COLLECTION (ALL SONGS) ------------------- */}
      {isAllSongsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={() => setIsAllSongsOpen(false)} />
          
          <div className="relative w-full max-w-xl bg-[#0f0f12] border border-white/10 rounded-2xl p-6 shadow-2xl z-10 flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2 text-[#00ff66]">
                <Music className="w-5 h-5" /> CASSETTE CATALOGUE ({filteredSongs.length} Tracks)
              </h2>
              <button 
                onClick={() => setIsAllSongsOpen(false)}
                className="text-white/50 hover:text-white p-1 hover:bg-white/5 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List */}
            <div className="flex-grow overflow-y-auto pr-1 space-y-2.5 scrollbar-thin font-mono">
              {filteredSongs.map((song, i) => (
                <div 
                  key={song.id}
                  onClick={() => selectSong(i)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                    activeSongIndex === i 
                      ? "bg-[#00ff66]/10 border-[#00ff66]/35 text-[#00ff66]"
                      : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs text-white/30 w-5">{(i + 1).toString().padStart(2, "0")}</span>
                    <div className="truncate font-sans">
                      <p className="font-bold text-sm truncate">{song.title}</p>
                      <p className="text-xs text-white/50 truncate font-medium">{song.artist}</p>
                    </div>
                  </div>
                  
                  <span className="text-[10px] uppercase font-bold tracking-wide text-white/30 px-2 py-0.5 bg-white/5 rounded border border-white/5">
                    {PLAYLISTS.find(p => p.id === song.playlist)?.name.split(" ")[0] || "Track"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Share Toast */}
      {shareToast && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 bg-[#00ff66] text-black text-xs font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5 transition-all animate-bounce">
          <span>📋</span> Link copied to dashboard clipboard!
        </div>
      )}
    </main>
  );
}
