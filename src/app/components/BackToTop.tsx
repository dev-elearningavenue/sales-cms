"use client";
import { useState, useEffect } from "react";
import { ChevronUp } from "lucide-react";

const BackToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  // Show button when page is scrolled down
  const toggleVisibility = () => {
    const mainContent = document.querySelector("main");
    if (mainContent) {
      if (mainContent.scrollTop > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    }
  };

  // Set the scroll event listener
  useEffect(() => {
    const mainContent = document.querySelector("main");
    if (mainContent) {
      mainContent.addEventListener("scroll", toggleVisibility);
      return () => mainContent.removeEventListener("scroll", toggleVisibility);
    }
  }, []);

  // Scroll to top function
  const scrollToTop = () => {
    const mainContent = document.querySelector("main");
    if (mainContent) {
      mainContent.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  return (
    <>
      {isVisible && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-5 right-5 p-3 rounded-full bg-blue-500 text-white shadow-lg hover:bg-blue-600 transition-all z-[100]"
          aria-label="Back to top"
        >
          <ChevronUp size={24} />
        </button>
      )}
    </>
  );
};

export default BackToTop;
