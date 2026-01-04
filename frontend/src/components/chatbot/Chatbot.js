import React from 'react';

const Chatbot = () => {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-blue-500 text-white p-4 rounded-full shadow-lg cursor-pointer hover:bg-blue-600 transition-colors">
        <span className="text-xl">💬</span>
      </div>
    </div>
  );
};

export default Chatbot;
