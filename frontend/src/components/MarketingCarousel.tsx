import { useEffect, useState } from "react";
import { BsChevronLeft, BsChevronRight } from "react-icons/bs";

const slides = [
  {
    title: "Classic restaurant atmosphere",
    description: "Bring your dining experience to life with iconic interiors and premium hospitality visuals.",
    image: "https://cdn.mos.cms.futurecdn.net/TzNKtsPPdN7t4MKoFtDpaa.jpg",
    badge: "Restaurant premium",
  },
  {
    title: "Timeless interior design",
    description: "Showcase elegant spaces and classic dining environments that feel warm and welcoming.",
    image: "https://thumbs.dreamstime.com/b/classic-restaurant-interior-4976504.jpg",
    badge: "Classic comfort",
  },
  {
    title: "Reliable delivery experience",
    description: "Keep orders moving with courier-ready workflows and strong delivery branding.",
    image: "https://thumbs.dreamstime.com/b/food-delivery-rider-scooter-illustration-425240286.jpg",
    badge: "Delivery ready",
  },
];

interface Props {
  height?: string;
  autoplay?: boolean;
  interval?: number;
}

const MarketingCarousel = ({ height = "420px", autoplay = true, interval = 5200 }: Props) => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!autoplay) return;
    const timer = window.setInterval(() => setIndex((prev) => (prev + 1) % slides.length), interval);
    return () => window.clearInterval(timer);
  }, [autoplay, interval]);

  const prev = () => setIndex((index - 1 + slides.length) % slides.length);
  const next = () => setIndex((index + 1) % slides.length);

  return (
    <div className="relative overflow-hidden rounded-[32px] shadow-2xl ring-1 ring-black/10" style={{ height }}>
      {slides.map((slide, slideIndex) => {
        const isActive = slideIndex === index;
        return (
          <div
            key={slide.title}
            className={`absolute inset-0 transition-transform duration-700 ${
              isActive ? "translate-x-0 opacity-100" : slideIndex < index ? "-translate-x-full opacity-0" : "translate-x-full opacity-0"
            }`}
            aria-hidden={!isActive}
          >
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${slide.image})` }} />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-transparent" />
            <div className="relative z-10 flex h-full flex-col justify-between px-6 py-8 text-white md:px-10 md:py-10">
              <div className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.24em] text-white/80 ring-1 ring-white/20 shadow-sm w-max">
                {slide.badge}
              </div>
              <div className="max-w-2xl space-y-5">
                <h2 className="text-3xl font-semibold leading-tight sm:text-4xl">{slide.title}</h2>
                <p className="max-w-xl text-sm text-slate-100 sm:text-base">{slide.description}</p>
              </div>
            </div>
          </div>
        );
      })}

      <button onClick={prev} className="absolute left-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white shadow-xl transition hover:bg-white/25">
        <BsChevronLeft className="h-5 w-5" />
      </button>
      <button onClick={next} className="absolute right-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white shadow-xl transition hover:bg-white/25">
        <BsChevronRight className="h-5 w-5" />
      </button>

      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {slides.map((_, dotIndex) => (
          <button key={dotIndex} onClick={() => setIndex(dotIndex)} className={`h-2 w-10 rounded-full transition ${dotIndex === index ? "bg-white" : "bg-white/30"}`} />
        ))}
      </div>
    </div>
  );
};

export default MarketingCarousel;
