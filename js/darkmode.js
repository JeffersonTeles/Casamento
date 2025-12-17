const darkModeToggle = document.getElementById('darkModeToggle');

darkModeToggle.addEventListener('click', () => {
  document.body.classList.toggle('dark-mode');
  localStorage.setItem('dark-mode', document.body.classList.contains('dark-mode'));
});

// Carrega modo escuro salvo
if (localStorage.getItem('dark-mode') === 'true') {
  document.body.classList.add('dark-mode');
}
