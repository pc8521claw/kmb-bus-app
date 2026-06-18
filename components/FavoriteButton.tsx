"use client";

import { useState, useEffect } from "react";
import { isFavorite, addFavorite, removeFavorite } from "@/lib/favorites";

interface FavoriteButtonProps {
  route: string;
}

export default function FavoriteButton({ route }: FavoriteButtonProps) {
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    setIsFav(isFavorite(route));
  }, [route]);

  const handleClick = () => {
    if (isFav) {
      removeFavorite(route);
      setIsFav(false);
    } else {
      addFavorite(route);
      setIsFav(true);
    }
  };

  return (
    <button
      onClick={handleClick}
      title={isFav ? "從常用路線移除" : "加到常用路線"}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-lg transition-all ${
        isFav
          ? "bg-yellow-300 text-yellow-900 hover:bg-yellow-400 ring-2 ring-yellow-400 shadow-sm"
          : "bg-stone-100 text-stone-400 hover:bg-stone-200 hover:text-yellow-500"
      }`}
    >
      <svg
        className="w-5 h-5"
        fill={isFav ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={isFav ? "1.5" : "2"}
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.563 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
        />
      </svg>
    </button>
  );
}
