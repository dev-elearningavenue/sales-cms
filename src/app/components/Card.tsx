import { useState } from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  darkMode?: boolean;
  hover?: boolean;
  flipContent?: React.ReactNode;
  isSquarish?: boolean;
}

export const Card = ({
  children,
  className = "",
  darkMode = false,
  hover = true,
  flipContent = null,
  isSquarish = false,
}: CardProps) => {
  const [flipped, setFlipped] = useState(false);

  const handleFlip = () => {
    if (flipContent) {
      setFlipped(!flipped);
    }
  };

  const baseClasses = `rounded-xl transition-all duration-300 perspective-1000 ${
    hover ? "hover:shadow-lg transform hover:-translate-y-1" : ""
  }`;
  const lightModeClasses = "bg-white shadow-sm border border-gray-100";
  const darkModeClasses =
    "bg-gray-800 shadow-md border border-gray-700 text-white";

  return (
    <div
      className={`${baseClasses} ${
        darkMode ? darkModeClasses : lightModeClasses
      } ${className} ${flipContent ? "cursor-pointer" : ""}`}
      onClick={handleFlip}
    >
      <div
        className={`relative w-full h-full transition-transform duration-500 ${
          flipped ? "rotate-y-180" : ""
        } preserve-3d`}
      >
        <div className="backface-hidden w-full h-full">{children}</div>

        {flipContent && (
          <div className="backface-hidden w-full h-full absolute top-0 left-0 rotate-y-180">
            {flipContent}
          </div>
        )}
      </div>
    </div>
  );
};
