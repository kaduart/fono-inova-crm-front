export default function MessageBubble({ text, isMine }) {
    return (
      <div className={`max-w-xs p-2 my-1 rounded-lg ${isMine ? 'bg-blue-500 text-white self-end' : 'bg-gray-200 text-black self-start'}`}>
        {text}
      </div>
    );
  }
  