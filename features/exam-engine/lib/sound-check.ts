/**
 * Audio used by the "Kiểm tra tai nghe" button in both exam lobbies.
 *
 * Hosted on Cloudflare R2 (public bucket) so it is cached at the edge and plays
 * on every device — the old Google `.ogg` sample is silent on iOS Safari.
 * Replace the object on R2 to change the sound check clip.
 */
export const SOUND_CHECK_AUDIO_URL =
  "https://pub-f83818e18140494f919cfb8f8a120959.r2.dev/audio.mp3"
