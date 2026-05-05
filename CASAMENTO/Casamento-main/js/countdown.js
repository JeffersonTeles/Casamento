// Data do casamento (AJUSTE AQUI)
const weddingDateValue = "October 12, 2026 16:00:00";
const weddingDate = new Date(weddingDateValue).getTime();
const rsvpOpenDate = new Date(weddingDateValue);
rsvpOpenDate.setMonth(rsvpOpenDate.getMonth() - 3);

function updateCountdown() {
  const now = new Date().getTime();
  const distance = weddingDate - now;

  // Se já passou da data
  if (distance <= 0) {
    document.getElementById("days").innerText = "0";
    document.getElementById("hours").innerText = "0";
    document.getElementById("minutes").innerText = "0";
    document.getElementById("seconds").innerText = "0";
    return;
  }

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  document.getElementById("days").innerText = days;
  document.getElementById("hours").innerText = hours;
  document.getElementById("minutes").innerText = minutes;
  document.getElementById("seconds").innerText = seconds;
}

function updateRsvpButton() {
  const button = document.getElementById("rsvp-button");
  const status = document.getElementById("rsvp-status");

  if (!button || !status) {
    return;
  }

  const isOpen = Date.now() >= rsvpOpenDate.getTime();
  const formattedDate = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(rsvpOpenDate);

  if (isOpen) {
    button.href = button.dataset.href;
    button.classList.remove("pointer-events-none", "cursor-not-allowed", "opacity-50");
    button.setAttribute("aria-disabled", "false");
    button.textContent = "Confirmar pelo WhatsApp";
    status.textContent = "Você pode editar a mensagem antes de enviar.";
    return;
  }

  button.removeAttribute("href");
  button.classList.add("pointer-events-none", "cursor-not-allowed", "opacity-50");
  button.setAttribute("aria-disabled", "true");
  button.textContent = "Confirmação indisponível no momento";
  status.textContent = `A confirmação ficará disponível a partir de ${formattedDate}.`;
}

// atualiza a cada 1 segundo
updateCountdown();
updateRsvpButton();
setInterval(updateCountdown, 1000);
