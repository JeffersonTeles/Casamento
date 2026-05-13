const form = document.getElementById('giftForm');
const guestNameInput = document.getElementById('guestName');
const selectedList = document.getElementById('selectedList');
const countSpan = document.getElementById('countSpan');
const submitBtn = document.getElementById('submitBtn');
const toast = document.getElementById('toast');
const summaryText = document.getElementById('summaryText');

const STORAGE_KEY = 'listaPresentesCasamento2027_checkbox';

function loadGifts() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function saveGifts(gifts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(gifts));
}

function showToast() {
  if (!toast) return;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function updateSummary() {
  const gifts = loadGifts();
  const totalCards = document.querySelectorAll('.card-option').length;
  if (!summaryText) return;
  summaryText.textContent = `Presentes reservados: ${gifts.length} de ${totalCards}.`;
}

function updateCardsState() {
  const gifts = loadGifts();
  const cards = document.querySelectorAll('.card-option');
  cards.forEach(card => {
    const giftName = card.dataset.gift;
    const input = card.querySelector('input[name="gift"]');
    const statusSpan = card.querySelector('.card-status');
    const reserved = gifts.some(g => g.gift === giftName);

    if (reserved) {
      card.classList.add('esgotado');
      input.disabled = true;
      input.checked = false;
      if (statusSpan) statusSpan.textContent = 'Já escolhido';
    } else {
      card.classList.remove('esgotado');
      input.disabled = false;
      if (statusSpan) statusSpan.textContent = 'Disponível';
    }
  });
}

function render() {
  const gifts = loadGifts();
  selectedList.innerHTML = '';

  gifts.forEach((gift, index) => {
    const li = document.createElement('li');

    const main = document.createElement('div');
    main.className = 'selected-main';
    main.textContent = `${gift.guest} escolheu: ${gift.gift}`;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.type = 'button';
    removeBtn.textContent = 'remover';
    removeBtn.addEventListener('click', () => {
      const ok = confirm('Tem certeza que deseja remover esse presente da lista?');
      if (!ok) return;
      const updated = loadGifts().filter((_, i) => i !== index);
      saveGifts(updated);
      render();
      updateButtonState();
    });

    li.appendChild(main);
    li.appendChild(removeBtn);
    selectedList.appendChild(li);
  });

  countSpan.textContent =
    gifts.length === 1
      ? '1 presente reservado'
      : `${gifts.length} presentes reservados`;

  updateCardsState();
  updateSummary();
}

function updateButtonState() {
  const guest = guestNameInput.value.trim();
  const anyChecked =
    document.querySelector('input[name="gift"]:checked') !== null;
  submitBtn.disabled = !guest || !anyChecked;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const guest = guestNameInput.value.trim();
  if (!guest) return;

  const checkedBoxes = document.querySelectorAll('input[name="gift"]:checked');
  if (checkedBoxes.length === 0) return;

  const gifts = loadGifts();

  checkedBoxes.forEach(cb => {
    const value = cb.value;
    if (!gifts.some(g => g.gift === value)) {
      gifts.push({ guest, gift: value });
    }
    cb.checked = false;
  });

  saveGifts(gifts);
  guestNameInput.value = '';
  render();
  updateButtonState();
  showToast();
});

guestNameInput.addEventListener('input', updateButtonState);
document.querySelectorAll('input[name="gift"]').forEach(cb => {
  cb.addEventListener('change', updateButtonState);
});

render();
updateButtonState();
