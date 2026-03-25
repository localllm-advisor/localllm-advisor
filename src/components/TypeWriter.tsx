'use client';

import { useState, useEffect } from 'react';

interface TypeWriterProps {
  /** Array of phrases to cycle through */
  phrases: string[];
  /** Typing speed in ms per character */
  typingSpeed?: number;
  /** Pause after full phrase is typed, in ms */
  pauseDuration?: number;
  /** Deleting speed in ms per character */
  deletingSpeed?: number;
  /** Extra className for the wrapper span */
  className?: string;
  /** Color class for the cursor */
  cursorColor?: string;
}

export default function TypeWriter({
  phrases,
  typingSpeed = 60,
  pauseDuration = 2000,
  deletingSpeed = 30,
  className = '',
  cursorColor = 'text-blue-400',
}: TypeWriterProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = phrases[phraseIndex];

    if (!isDeleting && charIndex === currentPhrase.length) {
      // Pause at end of phrase, then start deleting
      const timeout = setTimeout(() => setIsDeleting(true), pauseDuration);
      return () => clearTimeout(timeout);
    }

    if (isDeleting && charIndex === 0) {
      // Move to next phrase
      setIsDeleting(false);
      setPhraseIndex((prev) => (prev + 1) % phrases.length);
      return;
    }

    const speed = isDeleting ? deletingSpeed : typingSpeed;
    const timeout = setTimeout(() => {
      setCharIndex((prev) => prev + (isDeleting ? -1 : 1));
    }, speed);

    return () => clearTimeout(timeout);
  }, [charIndex, isDeleting, phraseIndex, phrases, typingSpeed, deletingSpeed, pauseDuration]);

  const currentText = phrases[phraseIndex].substring(0, charIndex);

  return (
    <span className={className}>
      {currentText}
      <span className={`inline-block w-[2px] h-[1em] ml-0.5 align-text-bottom animate-pulse ${cursorColor}`}>
        |
      </span>
    </span>
  );
}
