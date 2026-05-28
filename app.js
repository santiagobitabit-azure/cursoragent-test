/** Debut de Argentina en el Mundial 2026 — hora oficial Argentina */
const MATCH_START = new Date("2026-06-16T22:00:00-03:00");

const daysEl = document.getElementById("days");
const hoursEl = document.getElementById("hours");
const minutesEl = document.getElementById("minutes");
const secondsEl = document.getElementById("seconds");
const statusEl = document.getElementById("status");

function pad(n) {
  return String(n).padStart(2, "0");
}

function updateCountdown() {
  const now = Date.now();
  const diff = MATCH_START.getTime() - now;

  if (diff <= 0) {
    daysEl.textContent = "00";
    hoursEl.textContent = "00";
    minutesEl.textContent = "00";
    secondsEl.textContent = "00";
    statusEl.textContent = "¡Arrancó el partido! ¡Vamos Argentina! 🇦🇷";
    statusEl.classList.add("status--done");
    return;
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  daysEl.textContent = pad(days);
  hoursEl.textContent = pad(hours);
  minutesEl.textContent = pad(minutes);
  secondsEl.textContent = pad(seconds);

  statusEl.textContent = "Falta para el pitido inicial";
  statusEl.classList.remove("status--done");
}

updateCountdown();
setInterval(updateCountdown, 1000);
