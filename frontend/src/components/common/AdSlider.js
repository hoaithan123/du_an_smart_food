import React, { useEffect, useRef, useState } from 'react';

const slides = [
  {
    id: 1,
    title: 'Ưu đãi Peach & Cream',
    desc: 'Giảm đến 20% cho đơn đầu tiên hôm nay!',
    image: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1600&auto=format&fit=crop',
  },
  {
    id: 2,
    title: 'Combo Siêu Hời',
    desc: 'Món chính + Nước chỉ từ 15k thêm!',
    image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&q=80&w=764',
  },
  {
    id: 3,
    title: 'Super Combo',
    desc: 'Thêm tráng miệng ngon miệng chỉ +35k',
    image: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?q=80&w=1600&auto=format&fit=crop',
  },
  {
    id: 4,
    title: 'Freeship Toàn Quốc',
    desc: 'Đơn từ 200k áp dụng FREESHIP',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1600&auto=format&fit=crop',
  },
];

const AdSlider = () => {
  const [index, setIndex] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    startAuto();
    return stopAuto;
  }, [index]);

  const startAuto = () => {
    stopAuto();
    timerRef.current = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 4000);
  };

  const stopAuto = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const goTo = (i) => setIndex(i);
  const prev = () => setIndex((index - 1 + slides.length) % slides.length);
  const next = () => setIndex((index + 1) % slides.length);

  return (
    <div className="relative w-full max-w-7xl mx-auto px-4">
      <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden shadow-lg">
        {slides.map((s, i) => (
          <div
            key={s.id}
            className={`absolute inset-0 transition-opacity duration-700 ${i === index ? 'opacity-100' : 'opacity-0'} `}
            aria-hidden={i !== index}
          >
            <img
              src={s.image}
              alt={s.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400"><rect width="100%" height="100%" fill="%23e5e7eb"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-size="24" font-family="Arial, Helvetica, sans-serif">Image not available</text></svg>';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-black/10" />
            <div className="absolute inset-0 flex items-end">
              <div className="p-6 md:p-8">
                <h3 className="text-white text-2xl md:text-4xl font-bold drop-shadow-lg">{s.title}</h3>
                <p className="text-white/90 mt-2 md:mt-3 text-sm md:text-base max-w-xl">{s.desc}</p>
                <button className="mt-4 inline-flex items-center px-5 py-2.5 rounded-xl bg-accent text-white hover:opacity-95 transition">
                  Mua ngay →
                </button>
              </div>
            </div>
          </div>
        ))}

        <button onClick={prev} onMouseEnter={stopAuto} onMouseLeave={startAuto} className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/80 hover:bg-white text-gray-700 flex items-center justify-center shadow">
          ‹
        </button>
        <button onClick={next} onMouseEnter={stopAuto} onMouseLeave={startAuto} className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/80 hover:bg-white text-gray-700 flex items-center justify-center shadow">
          ›
        </button>
      </div>
      <div className="flex justify-center gap-2 mt-4">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`h-2.5 rounded-full transition-all ${i === index ? 'w-8 bg-accent' : 'w-2.5 bg-gray-300'}`}
            aria-label={`Slide ${i + 1}`}
          />)
        )}
      </div>
    </div>
  );
};

export default AdSlider;
