// Data do casamento (AJUSTE AQUI)
const weddingDateValue = "February 6, 2027 08:00:00";
const weddingDate = new Date(weddingDateValue).getTime();
const rsvpOpenDate = new Date(weddingDateValue);
rsvpOpenDate.setMonth(rsvpOpenDate.getMonth() - 3);

// Armazena valores anteriores para animação
let previousValues = { days: -1, hours: -1, minutes: -1, seconds: -1 };

function updateCountdown() {
  const now = new Date().getTime();
  const distance = weddingDate - now;

  // Se já passou da data
  if (distance <= 0) {
    document.getElementById("days").innerText = "0";
    document.getElementById("hours").innerText = "0";
    document.getElementById("minutes").innerText = "0";
    document.getElementById("seconds").innerText = "0";
    updateCountdownMessage(0);
    return;
  }

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  // Atualiza com animação apenas se o valor mudou
  updateWithAnimation("days", days, previousValues.days);
  updateWithAnimation("hours", hours, previousValues.hours);
  updateWithAnimation("minutes", minutes, previousValues.minutes);
  updateWithAnimation("seconds", seconds, previousValues.seconds);

  // Atualiza valores anteriores
  previousValues = { days, hours, minutes, seconds };

  // Atualiza mensagem baseada no tempo restante
  updateCountdownMessage(distance);
}

function updateWithAnimation(elementId, newValue, oldValue) {
  const element = document.getElementById(elementId);
  if (!element) return;

  if (newValue !== oldValue) {
    element.style.transform = "scale(1.2)";
    element.style.transition = "transform 0.2s ease-out";
    
    setTimeout(() => {
      element.style.transform = "scale(1)";
    }, 200);
  }

  element.innerText = newValue;
}

function updateCountdownMessage(distance) {
  const noteElement = document.getElementById("countdown-note");
  if (!noteElement) return;

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));

  let message = "";
  
  if (days > 365) {
    message = "Falta mais de um ano para o grande dia! 🎉";
  } else if (days > 180) {
    message = "Menos de 6 meses! A ansiedade está crescendo! 💕";
  } else if (days > 90) {
    message = "Menos de 3 meses! É hora de começar os preparativos finais! ✨";
  } else if (days > 30) {
    message = "Menos de 1 mês! O grande dia está chegando! 🎊";
  } else if (days > 7) {
    message = "Menos de uma semana! Estamos quase lá! 💍";
  } else if (days > 0) {
    message = "Dias finais! Tudo pronto para o sim! 💖";
  } else {
    message = "É hoje! O momento mais especial chegou! 💒";
  }

  noteElement.textContent = message;
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
