import React, { useEffect, useRef, useState } from "react";
import type { IRestaurant } from "../types/types";
import { BsChevronLeft, BsChevronRight } from "react-icons/bs";

interface Props {
  restaurants: IRestaurant[];
  height?: string; // CSS height
  autoplay?: boolean;
  interval?: number;
}

const RestaurantCarousel = ({ restaurants, height = "220px", autoplay = true, interval = 3000 }: Props) => {
  const [index, setIndex] = useState(0);
  const autoplayRef = useRef<number | null>(null);
  const startX = useRef<number | null>(null);

  useEffect(() => {
    if (!autoplay || restaurants.length <= 1) return;
    autoplayRef.current = window.setInterval(() => {
      setIndex((i) => (i + 1) % restaurants.length);
    }, interval);
    return () => {
      if (autoplayRef.current) window.clearInterval(autoplayRef.current);
    };
  }, [autoplay, interval, restaurants.length]);

  const prev = () => setIndex((i) => (i - 1 + restaurants.length) % restaurants.length);
  const next = () => setIndex((i) => (i + 1) % restaurants.length);

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    if (autoplayRef.current) {
      window.clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const delta = e.changedTouches[0].clientX - startX.current;
    if (Math.abs(delta) > 40) {
      if (delta < 0) next(); else prev();
    }
    startX.current = null;
  };

  if (!restaurants || restaurants.length === 0) return null;

  const current = restaurants[index];

  return (
    <div className="relative w-full group" style={{ height }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="absolute inset-0 flex items-center justify-center">
        <img src={current.image} alt={current.name} className="h-full w-full object-cover rounded-2xl shadow-sm transform-gpu transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent rounded-2xl" />
        <div className="absolute left-6 bottom-6 text-white">
          <h3 className="text-xl font-semibold drop-shadow">{current.name}</h3>
          {current.description && <p className="text-sm opacity-90 mt-1 max-w-xl line-clamp-2">{current.description}</p>}
        </div>
      </div>

      <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-md hover:scale-110 transform-gpu transition-transform">
        <BsChevronLeft className="text-gray-700" />
      </button>
      <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-md hover:scale-110 transform-gpu transition-transform">
        <BsChevronRight className="text-gray-700" />
      </button>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
        {restaurants.map((_, i) => (
          <button key={i} onClick={() => setIndex(i)} className={`h-2 w-8 rounded-full ${i === index ? "bg-white" : "bg-white/40"}`} />
        ))}
      </div>
    </div>
  );
};

export default RestaurantCarousel;
