import React, { useState } from 'react';
import { truncateToWordLimit } from '../utils/textUtils.js';

interface ExpandableSynopsisProps {
  text?: string | null;
  fallbackText?: string;
  maxWords?: number;
  className?: string;
}

export const ExpandableSynopsis: React.FC<ExpandableSynopsisProps> = ({
  text,
  fallbackText = 'No synopsis provided.',
  maxWords = 50,
  className = 'text-xs text-slate-300/90 mt-1.5 leading-relaxed'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text) {
    return <p className={className}>{fallbackText}</p>;
  }

  const { text: truncated, hasMore } = truncateToWordLimit(text, maxWords);

  if (!hasMore) {
    return <p className={className}>{text}</p>;
  }

  return (
    <p className={className}>
      <span>{isExpanded ? text : `${truncated}... `}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsExpanded(!isExpanded);
        }}
        className="text-cyan-400 hover:text-cyan-300 font-medium text-[11px] underline cursor-pointer inline-block ml-1 select-none"
      >
        {isExpanded ? 'less' : 'more'}
      </button>
    </p>
  );
};

export default ExpandableSynopsis;
