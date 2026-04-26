/**
 * AHAR notification sound placeholders
 *
 * Download or create these WAV files and place in assets/sounds/.
 * Recommended free source: https://mixkit.co/free-sound-effects/
 *
 * Required files:
 * - gentle.wav  — soft bell, 0.5 seconds, for low priority tips
 * - chime.wav   — pleasant 2-tone chime, 0.8 seconds, for meal checkins
 * - alert.wav   — clear 3-tone alert, 1 second, for high priority
 * - default.wav — standard notification sound, 0.5 seconds
 *
 * Search suggestions:
 * - gentle.wav: search 'soft bell' or 'gentle notification'
 * - chime.wav: search 'chime notification' or 'bell chime'
 * - alert.wav: search 'alert notification' or 'attention chime'
 *
 * Audio format requirement:
 * - mono, 44100Hz, 16-bit WAV format
 */

const fs = require("node:fs");
const path = require("node:path");

const soundsDir = path.resolve(process.cwd(), "assets", "sounds");
const files = ["gentle.wav", "chime.wav", "alert.wav", "default.wav"];

if (!fs.existsSync(soundsDir)) {
  fs.mkdirSync(soundsDir, { recursive: true });
}

for (const file of files) {
  const target = path.join(soundsDir, file);
  if (!fs.existsSync(target)) {
    fs.writeFileSync(target, "");
  }
}

console.log("Placeholder files ensured in assets/sounds/");
