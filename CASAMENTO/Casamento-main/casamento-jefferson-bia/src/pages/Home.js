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
    <div className="bg-gradient-to-b from-white via-slate-50 to-white font-corpo text-zinc-800 min-h-screen">
      <header className="w-full bg-white/70 backdrop-blur border-b border-white/60 sticky top-0 z-20">
        <nav className="max-w-5xl mx-auto flex items-center justify-between px-4 py-3">
          <a href="#topo" className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#120a74] text-white text-sm">J&B</span>
            <span className="font-titulo text-xl text-[#120a74]">Jefferson & Beatriz</span>
          </a>
          <div className="hidden sm:flex items-center gap-4 text-xs font-medium">
            <a href="#sobre" className="text-[#120a74]/80 hover:text-[#120a74]">Sobre</a>
            <a href="#contagem" className="text-[#120a74]/80 hover:text-[#120a74]">Contagem</a>
            <a href="/gifts.html" className="text-[#120a74]/80 hover:text-[#120a74]">Presentes</a>
            <a href="/faq.html" className="text-[#120a74]/80 hover:text-[#120a74]">Dúvidas</a>
            <a href="#rsvp" className="text-[#120a74]/80 hover:text-[#120a74]">Confirme</a>
            <a href="/admin/login" className="inline-flex items-center rounded-full border border-[#120a74]/40 px-3 py-1.5 text-[#120a74] hover:bg-[#120a74]/5">
              Organização
            </a>
          </div>
        </nav>
      </header>

      <main id="topo">
        <section className="max-w-5xl mx-auto px-4 pt-10 pb-12 grid md:grid-cols-2 gap-8">
          <div className="flex flex-col justify-center">
            <p className="uppercase tracking-[0.35em] text-[0.65rem] text-[#120a74]/70 mb-2">Save the date</p>
            <h1 className="font-titulo text-4xl md:text-5xl text-[#120a74] leading-tight">
              Jefferson <span className="text-rosa">&</span> Beatriz
            </h1>
            <p className="mt-3 text-sm text-zinc-600">06 de fevereiro de 2027 às 08:00 DA MANHÃ (PONTUALMENTE) • Cascavel - PR</p>
            <p className="mt-4 text-sm text-zinc-700 leading-relaxed">
              É com muita alegria que convidamos você para celebrar conosco este dia tão especial. Sua presença tornará tudo ainda mais inesquecível.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#contagem" className="inline-flex items-center justify-center rounded-full bg-[#120a74] px-6 py-2.5 text-xs font-semibold text-white shadow-md shadow-[#120a74]/20 hover:bg-[#120a74]/90 transition">
                Ver contagem regressiva
              </a>
              <a href="/gifts.html" className="inline-flex items-center justify-center rounded-full border border-[#120a74]/60 px-6 py-2.5 text-xs font-semibold text-[#120a74] hover:bg-[#120a74]/5 transition">
                Lista de presentes
              </a>
            </div>
          </div>

          <div className="relative flex items-center justify-center md:justify-end">
            <div className="h-64 w-64 md:h-72 md:w-72 overflow-hidden rounded-[2.5rem] bg-slate-100 shadow-xl shadow-slate-200/50 border border-white/80">
              <img src="./img/foto1.jpeg" alt="Jefferson e Beatriz" className="h-full w-full object-cover" />
            </div>
            <div className="hidden md:block absolute -bottom-5 left-1/2 -translate-x-1/2 bg-white/90 rounded-2xl px-4 py-2 shadow-md text-[0.7rem] text-[#120a74]">
              <p className="font-semibold">“Um dia para guardar para sempre.”</p>
            </div>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 pb-10">
          <div className="grid gap-4 md:grid-cols-3 text-xs text-zinc-700 bg-white/80 rounded-3xl border border-white/70 shadow-sm p-4">
            <div>
              <p className="font-semibold text-[#120a74]">Cerimônia</p>
              <p className="mt-1">08:00 DA MANHÃ (PONTUALMENTE) • Paróquia Nossa Senhora de Fátima Cancellia<br />Cascavel - PR</p>
              <div className="mt-4 rounded-2xl overflow-hidden border border-[#120a74]/20 shadow-md">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3618.0!2d-53.4558!3d-24.9578!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sCapela+S%C3%A3o+Maximiliano+Cascavel+PR!5e0!3m2!1spt!2sbr!4v1"
                  width="100%"
                  height="260"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Localização da Capela São Maximiliano — Cascavel PR"
                  className="w-full"
                ></iframe>
              </div>
              <p className="mt-2 text-[0.7rem] text-zinc-600">
                <a href="https://maps.app.goo.gl/TBtd7eAjcBzWDuGq7" target="_blank" rel="noreferrer" className="text-[#120a74] underline">Abrir no Google Maps →</a>
              </p>
            </div>
            <div>
              <p className="font-semibold text-[#120a74]">Recepção</p>
              <p className="mt-1">Não teremos recepção após a cerimônia.</p>
            </div>
            <div>
              <p className="font-semibold text-[#120a74]">Traje sugerido</p>
              <p className="mt-1">Traje livre • Proibido cores claras semelhantes ao branco</p>
            </div>
          </div>
        </section>

        <section id="contagem" className="max-w-5xl mx-auto px-4 py-12">
          <h2 className="font-titulo text-2xl text-center text-[#120a74]">
            {isAfterWedding ? 'Nosso casamento aconteceu há' : 'Falta pouco para o grande dia'}
          </h2>
          <p className="mt-2 text-center text-sm text-zinc-600">
            {isAfterWedding
              ? 'Uma contagem de carinho desde o nosso "sim".'
              : 'Acompanhe a contagem regressiva até o momento do "sim".'}
          </p>
          <div className="mt-6 bg-white/90 border border-slate-100 rounded-3xl p-5 shadow-sm">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-[#120a74]">
              <div className="bg-white/90 rounded-2xl py-4 shadow-sm border border-slate-100">
                <div className="text-2xl font-semibold">{timeLeft.days}</div>
                <div className="mt-1 text-[0.65rem] uppercase tracking-wide text-zinc-500">Dias</div>
              </div>
              <div className="bg-white/90 rounded-2xl py-4 shadow-sm border border-slate-100">
                <div className="text-2xl font-semibold">{timeLeft.hours}</div>
                <div className="mt-1 text-[0.65rem] uppercase tracking-wide text-zinc-500">Horas</div>
              </div>
              <div className="bg-white/90 rounded-2xl py-4 shadow-sm border border-slate-100">
                <div className="text-2xl font-semibold">{timeLeft.minutes}</div>
                <div className="mt-1 text-[0.65rem] uppercase tracking-wide text-zinc-500">Minutos</div>
              </div>
              <div className="bg-white/90 rounded-2xl py-4 shadow-sm border border-slate-100">
                <div className="text-2xl font-semibold">{timeLeft.seconds}</div>
                <div className="mt-1 text-[0.65rem] uppercase tracking-wide text-zinc-500">Segundos</div>
              </div>
            </div>
          </div>
        </section>

        <section id="rsvp" className="max-w-5xl mx-auto px-4 pb-14 flex flex-col items-center">
          <div className="w-full bg-white/90 border border-slate-100 rounded-3xl shadow-sm p-5 md:p-6">
            <h2 className="font-titulo text-2xl text-[#120a74] text-center">Confirme sua presença</h2>
            <div className="mt-5 flex flex-col sm:flex-row gap-3 items-center justify-center">
              <a href="https://wa.me/5544999277915?text=Oi%2C%20aqui%20%C3%A9%20SEU%20NOME%2C%20confirmando%20minha%20presen%C3%A7a%20no%20casamento%20do%20Jefferson%20e%20da%20Beatriz.%20%F0%9F%92%8D"
                target="_blank" rel="noreferrer"
                className="inline-flex items-center justify-center rounded-full bg-[#120a74] px-6 py-2.5 text-xs font-semibold text-white shadow-md hover:bg-[#120a74]/90 transition">
                Confirmar pelo WhatsApp
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-6 border-t border-slate-100 bg-white/60">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col md:flex-row items-center justify-between gap-2 text-[0.7rem] text-zinc-500">
          <span>Com carinho, Jefferson & Beatriz</span>
          <span>Que esse seja apenas o começo de muitas comemorações.</span>
        </div>
      </footer>
    </div>
  );
};

export default Home;