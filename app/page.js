// Landing page pública — opadelivery.com/
export default function HomePage() {
  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Logo */}
        <div className="inline-flex items-center gap-3 mb-6">
          <div className="w-14 h-14 bg-brand-red rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-white font-black text-3xl">O</span>
          </div>
          <span className="font-black text-4xl text-gray-800">
            Opa<span className="text-brand-red">Delivery</span>
          </span>
        </div>

        <p className="text-gray-500 text-lg mb-10 leading-relaxed">
          Peça nas melhores lojas da sua cidade, sem sair de casa.
        </p>

        <a
          href="/dashboard"
          className="inline-block bg-brand-red text-white font-bold px-8 py-4 rounded-xl
                     hover:bg-brand-red-dark transition-colors shadow-md"
        >
          Área do Lojista
        </a>
      </div>
    </main>
  );
}
