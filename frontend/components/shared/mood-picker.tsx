"use client";

import { motion } from "framer-motion";

const MOODS = [
  "😊", "😍", "🥰", "🤩", "😎", "🤗", "😌", "💕", "❤️", "🌟",
  "✨", "🎉", "🌈", "🌸", "🌺", "🦋", "🎀", "💖", "💝", "🫶"
];

interface MoodPickerProps {
  selected?: string;
  onSelect: (mood: string) => void;
  size?: "sm" | "md" | "lg";
}

export function MoodPicker({ selected, onSelect, size = "md" }: MoodPickerProps) {
  const sizeClasses = {
    sm: "text-xl p-1.5",
    md: "text-2xl p-2",
    lg: "text-3xl p-3",
  };

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {MOODS.map((mood) => (
        <motion.button
          key={mood}
          type="button"
          onClick={() => onSelect(mood)}
          className={`${sizeClasses[size]} rounded-xl border-2 transition-all hover:scale-110 ${
            selected === mood
              ? "border-primary bg-primary/10 scale-110"
              : "border-transparent hover:border-border"
          }`}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          {mood}
        </motion.button>
      ))}
    </div>
  );
}

