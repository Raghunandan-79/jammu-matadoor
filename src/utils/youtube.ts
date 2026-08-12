/**
 * Extracts the 11-character YouTube video ID from a YouTube URL or iframe embed code.
 * Supports:
 * - https://www.youtube.com/watch?v=dQw4w9WgXcQ
 * - https://youtu.be/dQw4w9WgXcQ
 * - https://www.youtube.com/embed/dQw4w9WgXcQ
 * - https://youtube.com/shorts/dQw4w9WgXcQ
 * - Full iframe code: <iframe ... src="https://www.youtube.com/embed/dQw4w9WgXcQ" ...></iframe>
 * - dQw4w9WgXcQ (raw ID)
 */
export function getYouTubeId(url: string): string {
  if (!url) return "";
  
  let cleaned = url.trim();
  
  // If it's a full iframe HTML tag, extract the src URL value first
  if (cleaned.includes("<iframe") && cleaned.includes("src=")) {
    const srcMatch = cleaned.match(/src=["']([^"']+)["']/);
    if (srcMatch && srcMatch[1]) {
      cleaned = srcMatch[1];
    }
  }
  
  // If it's already just a 11 character ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleaned)) {
    return cleaned;
  }
  
  // Regular expressions to match different formats
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
  const match = cleaned.match(regExp);
  
  if (match && match[2].length === 11) {
    return match[2];
  }
  
  return "";
}
