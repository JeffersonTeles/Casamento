class SiteHeader extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <header class="w-full bg-white/95 backdrop-blur-sm border-b border-[#c9a96e]/15 sticky top-0 z-20">
        <nav class="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between px-4 py-4 md:py-3 gap-4 md:gap-3">
          <a href="index.html" class="flex items-center gap-2">
            <span class="font-titulo text-2xl text-[#1a1a2e]">Jefferson &amp; Beatriz</span>
          </a>
          <div class="flex items-center gap-2 md:gap-5 text-xs font-semibold overflow-x-auto no-scrollbar whitespace-nowrap py-1 w-full md:w-auto justify-start md:justify-center px-1">
            <a href="index.html#sobre" class="nav-link text-[#1a1a2e]/70 hover:text-[#1a1a2e] hover:bg-[#1a1a2e]/5 transition-all py-2 px-3 rounded-lg">Sobre</a>
            <a href="gifts.html" class="nav-link text-[#1a1a2e]/70 hover:text-[#1a1a2e] hover:bg-[#1a1a2e]/5 transition-all py-2 px-3 rounded-lg">Presentes</a>
            <a href="index.html#local" class="nav-link text-[#1a1a2e]/70 hover:text-[#1a1a2e] hover:bg-[#1a1a2e]/5 transition-all py-2 px-3 rounded-lg">Local</a>
            <a href="faq.html" class="nav-link text-[#1a1a2e]/70 hover:text-[#1a1a2e] hover:bg-[#1a1a2e]/5 transition-all py-2 px-3 rounded-lg">Dúvidas</a>
          </div>
        </nav>
      </header>
    `;
    
    // Auto-highlight active link
    const links = this.querySelectorAll('a.nav-link');
    const currentPath = window.location.pathname;
    
    links.forEach(link => {
      const href = link.getAttribute('href');
      // Highlight logic
      if (
        (href.includes('index.html') && (currentPath.endsWith('/') || currentPath.endsWith('index.html')) && !href.includes('#')) ||
        (href.includes('gifts.html') && currentPath.includes('gifts.html')) ||
        (href.includes('faq.html') && currentPath.includes('faq.html'))
      ) {
         link.classList.add('text-[#1a1a2e]', 'font-bold', 'bg-[#1a1a2e]/5');
         link.classList.remove('text-[#1a1a2e]/70');
      }
    });
  }
}

customElements.define('site-header', SiteHeader);
