import React, { useState, useEffect } from 'react';

const Home = () => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isAfterWedding, setIsAfterWedding] = useState(false);

  useEffect(() => {
    const weddingDate = new Date('2027-02-06T08:00:00-03:00').getTime();

    function getTimeParts(ms) {
      const total = Math.abs(ms);
      return {
        days: Math.floor(total / (1000 * 60 * 60 * 24)),
        hours: Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((total % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((total % (1000 * 60)) / 1000),
      };
    }

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = weddingDate - now;

      setIsAfterWedding(distance < 0);
      setTimeLeft(getTimeParts(distance));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-gradient-to-b from-champagne/60 via-rose-50 to-white font-corpo text-zinc-800 min-h-screen">
      <header className="w-full bg-white/70 backdrop-blur border-b border-white/60 sticky top-0 z-20">
        <nav className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <a href="#topo" className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-vinho text-white text-sm">J&B</span>
            <span className="font-titulo text-xl text-vinho">Jefferson & Bia</span>
          </a>
          <div className="hidden sm:flex items-center gap-4 text-xs font-medium">
            <a href="#sobre" className="text-vinho/80 hover:text-vinho">Sobre</a>
            <a href="#contagem" className="text-vinho/80 hover:text-vinho">Contagem</a>
            <a href="/gifts.html" className="text-vinho/80 hover:text-vinho">Presentes</a>
            <a href="/faq.html" className="text-vinho/80 hover:text-vinho">Dúvidas</a>
            <a href="#rsvp" className="text-vinho/80 hover:text-vinho">Confirme</a>
            <a href="/admin/login" className="inline-flex items-center rounded-full border border-vinho/40 px-3 py-1.5 text-vinho hover:bg-vinho/5">
              Organização
            </a>
          </div>
        </nav>
      </header>

      <main id="topo">
        <section className="max-w-5xl mx-auto px-4 pt-10 pb-12 grid md:grid-cols-2 gap-8">
          <div className="flex flex-col justify-center">
            <p className="uppercase tracking-[0.35em] text-[0.65rem] text-vinho/70 mb-2">Save the date</p>
            <h1 className="font-titulo text-4xl md:text-5xl text-vinho leading-tight">
              Jefferson <span className="text-rosa">&</span> Bia
            </h1>
            <p className="mt-3 text-sm text-zinc-600">06 de fevereiro de 2027 às 08:00 • Cascavel - PR</p>
            <p className="mt-4 text-sm text-zinc-700 leading-relaxed">
              É com muita alegria que convidamos você para celebrar conosco este dia tão especial. Sua presença tornará tudo ainda mais inesquecível.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#contagem" className="inline-flex items-center justify-center rounded-full bg-vinho px-6 py-2.5 text-xs font-semibold text-white shadow-md shadow-vinho/20 hover:bg-vinho/90 transition">
                Ver contagem regressiva
              </a>
              <a href="/gifts.html" className="inline-flex items-center justify-center rounded-full border border-vinho/60 px-6 py-2.5 text-xs font-semibold text-vinho hover:bg-vinho/5 transition">
                Lista de presentes
              </a>
            </div>
          </div>

          <div className="relative flex items-center justify-center md:justify-end">
            <div className="h-64 w-64 md:h-72 md:w-72 overflow-hidden rounded-[2.5rem] bg-rose-100 shadow-xl shadow-rose-200/70 border border-white/80">
              <img src="./img/foto1.jpeg" alt="Jefferson e Bia" className="h-full w-full object-cover" />
            </div>
            <div className="hidden md:block absolute -bottom-5 left-1/2 -translate-x-1/2 bg-white/90 rounded-2xl px-4 py-2 shadow-md text-[0.7rem] text-vinho">
              <p className="font-semibold">“Um dia para guardar para sempre.”</p>
            </div>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 pb-10">
          <div className="grid gap-4 md:grid-cols-3 text-xs text-zinc-700 bg-white/80 rounded-3xl border border-white/70 shadow-sm p-4">
            <div>
              <p className="font-semibold text-vinho">Cerimônia</p>
              <p className="mt-1">Horário a confirmar • Paróquia Nossa Senhora de Fátima Cancellia<br />Cascavel - PR</p>
              <p className="mt-2 text-[0.7rem] text-zinc-600">
                <a href="https://maps.app.goo.gl/TBtd7eAjcBzWDuGq7" target="_blank" rel="noreferrer" className="text-vinho underline">Ver mapa de como chegar à igreja</a>
              </p>
            </div>
            <div>
              <p className="font-semibold text-vinho">Recepção</p>
              <p className="mt-1">Após a cerimônia • Recepção/jantar com convidados próximos<br />Cascavel - PR</p>
            </div>
            <div>
              <p className="font-semibold text-vinho">Traje sugerido</p>
              <p className="mt-1">Passeio completo • Cores claras<br />Evite branco total</p>
            </div>
          </div>
        </section>

        <section id="sobre" className="bg-white/70 border-y border-white/80">
          <div className="max-w-5xl mx-auto px-4 py-10 grid md:grid-cols-2 gap-8 items-start">
            <div>
              <h2 className="font-titulo text-2xl text-vinho mb-3">Nossa história</h2>
              <p className="text-sm leading-relaxed text-zinc-700">
                A nossa história começou de um jeito bem moderno: pelo Instagram.
                Depois de muitas conversas e mensagens, decidimos nos ver pessoalmente em uma sorveteria...
              </p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-700">
                No encontro seguinte, assistimos a um filme juntos... no lago de Cascavel veio o pedido de namoro.
              </p>
            </div>
            <div className="space-y-3 text-xs text-zinc-700 bg-rose-50/80 rounded-3xl p-4 border border-rose-100">
              <p className="font-semibold text-vinho">“O amor é a força que transforma e melhora o mundo.”</p>
            </div>
          </div>
        </section>

        <section id="contagem" className="max-w-5xl mx-auto px-4 py-12">
          <h2 className="font-titulo text-2xl text-center text-vinho">
            {isAfterWedding ? 'Nosso casamento aconteceu há' : 'Falta pouco para o grande dia'}
          </h2>
          <p className="mt-2 text-center text-sm text-zinc-600">
            {isAfterWedding
              ? 'Uma contagem de carinho desde o nosso "sim".'
              : 'Acompanhe a contagem regressiva até o momento do "sim".'}
          </p>
          <div className="mt-6 bg-white/90 border border-rose-100 rounded-3xl p-5 shadow-sm">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-vinho">
              <div className="bg-white/90 rounded-2xl py-4 shadow-sm border border-rose-100">
                <div className="text-2xl font-semibold">{timeLeft.days}</div>
                <div className="mt-1 text-[0.65rem] uppercase tracking-wide text-zinc-500">Dias</div>
              </div>
              <div className="bg-white/90 rounded-2xl py-4 shadow-sm border border-rose-100">
                <div className="text-2xl font-semibold">{timeLeft.hours}</div>
                <div className="mt-1 text-[0.65rem] uppercase tracking-wide text-zinc-500">Horas</div>
              </div>
              <div className="bg-white/90 rounded-2xl py-4 shadow-sm border border-rose-100">
                <div className="text-2xl font-semibold">{timeLeft.minutes}</div>
                <div className="mt-1 text-[0.65rem] uppercase tracking-wide text-zinc-500">Minutos</div>
              </div>
              <div className="bg-white/90 rounded-2xl py-4 shadow-sm border border-rose-100">
                <div className="text-2xl font-semibold">{timeLeft.seconds}</div>
                <div className="mt-1 text-[0.65rem] uppercase tracking-wide text-zinc-500">Segundos</div>
              </div>
            </div>
          </div>
        </section>

        <section id="rsvp" className="max-w-5xl mx-auto px-4 pb-14 flex flex-col items-center">
          <div className="w-full bg-white/90 border border-rose-100 rounded-3xl shadow-sm p-5 md:p-6">
            <h2 className="font-titulo text-2xl text-vinho text-center">Confirme sua presença</h2>
            <div className="mt-5 flex flex-col sm:flex-row gap-3 items-center justify-center">
              <a href="https://wa.me/5544999277915?text=Oi%2C%20aqui%20%C3%A9%20SEU%20NOME%2C%20confirmando%20minha%20presen%C3%A7a%20no%20casamento%20do%20Jefferson%20e%20da%20Bia.%20%F0%9F%92%8D"
                target="_blank" rel="noreferrer"
                className="inline-flex items-center justify-center rounded-full bg-vinho px-6 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-vinho/90 transition">
                Confirmar pelo WhatsApp
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-6 border-t border-rose-100 bg-white/60">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-2 text-[0.7rem] text-zinc-500">
          <span>Com carinho, Jefferson & Bia</span>
          <span>Que esse seja apenas o começo de muitas comemorações.</span>
        </div>
      </footer>
    </div>
  );
};

export default Home;