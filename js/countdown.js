// Configuração da Data do Casamento (Cascavel - PR)
// Ano, Mês (0-11), Dia, Hora, Minuto, Segundo
// Fevereiro é mês 1
const TARGET_DATE = new Date(2027, 1, 6, 8, 0, 0); 
const WEDDING_TIME = TARGET_DATE.getTime();

// Data de abertura do RSVP (3 meses antes)
const RSVP_OPEN_DATE = new Date(2027, 1, 6, 8, 0, 0);
RSVP_OPEN_DATE.setMonth(RSVP_OPEN_DATE.getMonth() - 3);

// Armazena valores anteriores para evitar animações desnecessárias
let previousValues = { days: -1, hours: -1, minutes: -1, seconds: -1 };

/**
 * Função principal que atualiza o cronômetro
 */
function updateCountdown() {
  const now = new Date().getTime();
  const distance = WEDDING_TIME - now;

  // Seleção dos elementos (cache manual para performance)
  const elDays = document.getElementById("days");
  const elHours = document.getElementById("hours");
  const elMins = document.getElementById("minutes");
  const elSecs = document.getElementById("seconds");

  if (!elDays || !elHours || !elMins || !elSecs) return;

  // Se já passou da data ou é o momento exato
  if (distance <= 0) {
    elDays.innerText = "0";
    elHours.innerText = "0";
    elMins.innerText = "0";
    elSecs.innerText = "0";
    updateCountdownMessage(0);
    updateRsvpButton(); // Garante que o botão atualiza se o tempo passar com a página aberta
    return;
  }

  // Cálculos matemáticos de tempo
  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  // Atualiza a interface com efeito visual de escala
  updateValueWithEffect("days", days, previousValues.days);
  updateValueWithEffect("hours", hours, previousValues.hours);
  updateValueWithEffect("minutes", minutes, previousValues.minutes);
  updateValueWithEffect("seconds", seconds, previousValues.seconds);

  // Guarda o estado atual
  previousValues = { days, hours, minutes, seconds };

  // Atualiza a frase de impacto
  updateCountdownMessage(distance);
  
  // Atualiza o estado do botão RSVP
  updateRsvpButton();
}

/**
 * Aplica efeito visual apenas quando o número muda
 */
function updateValueWithEffect(id, newVal, oldVal) {
  const el = document.getElementById(id);
  if (!el) return;
  
  if (newVal !== oldVal) {
    el.innerText = newVal < 10 && id !== "days" ? "0" + newVal : newVal;
    el.style.transform = "scale(1.15)";
    el.style.transition = "transform 0.1s ease-out";
    setTimeout(() => {
      el.style.transform = "scale(1)";
    }, 150);
  }
}

/**
 * Atualiza a mensagem de acordo com a proximidade
 */
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

/**
 * Controla a liberação do botão de confirmação
 */
function updateRsvpButton() {
  const btn = document.getElementById("rsvp-link");
  if (!btn) return;

  const now = Date.now();
  const isOpen = now >= RSVP_OPEN_DATE.getTime();

  if (isOpen) {
    if (btn.classList.contains("opacity-50")) {
      btn.href = btn.dataset.href;
      btn.classList.remove("pointer-events-none", "cursor-not-allowed", "opacity-50");
      btn.textContent = "Confirmar Presença";
    }
  } else {
    // Mantém bloqueado
    if (!btn.classList.contains("opacity-50")) {
      btn.removeAttribute("href");
      btn.classList.add("pointer-events-none", "cursor-not-allowed", "opacity-50");
    }
  }
}

// Inicialização imediata
document.addEventListener("DOMContentLoaded", () => {
  updateCountdown();
  // Loop de atualização (1s)
  setInterval(updateCountdown, 1000);
});
