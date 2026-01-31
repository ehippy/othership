import React, { useEffect, useRef, useState } from "react";

interface FAQSectionProps {
  id: string;
  question: string;
  children: React.ReactNode;
}

export function FAQSection({ id, question, children }: FAQSectionProps) {
  const [isHighlighted, setIsHighlighted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if this section is the target on mount
    const checkTarget = () => {
      const hash = window.location.hash.substring(1);
      if (hash === id) {
        console.log(`[FAQSection] Highlighting section: ${id}`);
        setIsHighlighted(true);
        // Keep it highlighted - don't remove
      } else {
        // Clear highlight if hash changes to different section
        setIsHighlighted(false);
      }
    };

    checkTarget();

    // Listen for hash changes
    window.addEventListener('hashchange', checkTarget);
    return () => window.removeEventListener('hashchange', checkTarget);
  }, [id]);

  return (
    <div 
      id={id} 
      ref={ref}
      className={`bg-gray-800 border rounded-lg p-6 transition-all duration-300 ${
        isHighlighted 
          ? 'border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.5)] bg-gray-800/90' 
          : 'border-gray-700'
      }`}
    >
      <h2 className="text-2xl font-semibold mb-4 text-indigo-400">
        {question}
      </h2>
      <div className="text-gray-300 leading-relaxed space-y-4">
        {children}
      </div>
    </div>
  );
}
