const TARGET_DATE = new Date(2027, 1, 6, 8, 0, 0);
const WEDDING_TIME = TARGET_DATE.getTime();

const RSVP_OPEN_DATE = new Date(2027, 1, 6, 8, 0, 0);
RSVP_OPEN_DATE.setMonth(RSVP_OPEN_DATE.getMonth() - 3);

function updateCountdown() {
  const now = new Date().getTime();
  const distance = WEDDING_TIME - now;

  const elDays = document.getElementById("days");
  const elHours = document.getElementById("hours");
  const elMins = document.getElementById("minutes");
  const elSecs = document.getElementById("seconds");

  if (!elDays || !elHours || !elMins || !elSecs) return;

  if (distance <= 0) {
    elDays.innerText = "0";
    elHours.innerText = "0";
    elMins.innerText = "0";
    elSecs.innerText = "0";
    updateCountdownMessage(0);
    updateRsvpButton();
    return;
  }

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  updateValueWithEffect("days", days);
  updateValueWithEffect("hours", hours);
  updateValueWithEffect("minutes", minutes);
  updateValueWithEffect("seconds", seconds);

  updateCountdownMessage(distance);
  updateRsvpButton();
}

function updateValueWithEffect(id, newVal) {
  const el = document.getElementById(id);
  if (!el) return;
  const formatted = (newVal < 10 && id !== "days") ? "0" + newVal : String(newVal);
  if (el.innerText !== formatted) {
    el.innerText = formatted;
    el.style.transform = "scale(1.15)";
    el.style.transition = "transform 0.1s ease-out";
    setTimeout(() => { el.style.transform = "scale(1)"; }, 150);
  }
}

function updateCountdownMessage(distance) {
  const note = document.getElementById("countdown-note");
  if (!note) return;

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  let msg = "";

  if (distance <= 0) msg = "É hoje! O grande momento chegou! ❤️";
  else if (days > 365) msg = "Falta mais de um ano para o nosso grande dia!";
  else if (days > 90) msg = "Os preparativos estão a todo vapor!";
  else if (days > 30) msg = "Falta pouco para o momento do sim!";
  else if (days > 7) msg = "A ansiedade está batendo, falta muito pouco!";
  else msg = "Contagem regressiva final para o dia mais especial!";

  if (note.textContent !== msg) note.textContent = msg;
}

function updateRsvpButton() {
  const btn = document.getElementById("rsvp-link");
  if (!btn) return;

  const isOpen = Date.now() >= RSVP_OPEN_DATE.getTime();

  if (isOpen) {
    if (btn.classList.contains("opacity-50")) {
      btn.href = btn.dataset.href;
      btn.classList.remove("pointer-events-none", "cursor-not-allowed", "opacity-50");
      btn.textContent = "Confirmar Presença";
    }
  } else {
    if (!btn.classList.contains("opacity-50")) {
      btn.removeAttribute("href");
      btn.classList.add("pointer-events-none", "cursor-not-allowed", "opacity-50");
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updateCountdown();
  setInterval(updateCountdown, 1000);
});
