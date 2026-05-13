const darkModeToggle = document.getElementById('darkModeToggle');

if (darkModeToggle) {
  // Aplica preferência salva
  if (localStorage.getItem('dark-mode') === 'true') {
    document.body.classList.add('dark-mode');
    darkModeToggle.textContent = '☀️';
  } else {
    darkModeToggle.textContent = '🌙';
  }

  // Alterna tema ao clicar
  darkModeToggle.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('dark-mode', isDark);
    darkModeToggle.textContent = isDark ? '☀️' : '🌙';
  });
}
