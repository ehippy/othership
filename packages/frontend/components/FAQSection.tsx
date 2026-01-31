import React from "react";

interface FAQSectionProps {
  id: string;
  question: string;
  children: React.ReactNode;
}

export function FAQSection({ id, question, children }: FAQSectionProps) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h2 id={id} className="text-2xl font-semibold mb-4 text-indigo-400">
        {question}
      </h2>
      <div className="text-gray-300 leading-relaxed space-y-4">
        {children}
      </div>
    </div>
  );
}
