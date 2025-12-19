"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, getDayOfWeek } from "@/lib/utils";
import { mediaApi } from "@/lib/api";
import { ChevronDown, Image as ImageIcon } from "lucide-react";

interface CalendarDay {
  id: number;
  date: string;
  title?: string;
  mood?: string;
  note?: string;
  photos: Array<{
    id: number;
    url: string;
    order: number;
  }>;
  items: Array<{
    id: number;
    type: string;
    text: string;
    time?: string;
  }>;
}

interface CalendarDayCardProps {
  day: CalendarDay;
  onStoriesClick?: (photos: CalendarDay['photos']) => void;
}

export function CalendarDayCard({ day, onStoriesClick }: CalendarDayCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const date = new Date(day.date);
  const dayOfWeek = getDayOfWeek(date);
  const formattedDate = formatDate(date);

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'plan':
        return '📅';
      case 'note':
        return '📝';
      case 'gift':
        return '🎁';
      case 'place':
        return '📍';
      default:
        return '•';
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div
        className="p-6 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground font-medium">
                {dayOfWeek}
              </div>
              <div className="text-3xl font-bold">{date.getDate()}</div>
            </div>
            
            <div>
              <div className="text-lg font-semibold flex items-center gap-2">
                {day.mood && <span className="text-2xl">{day.mood}</span>}
                {day.title || formattedDate}
              </div>
              {day.note && !isExpanded && (
                <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                  {day.note}
                </p>
              )}
              <div className="flex gap-2 mt-2">
                {day.photos.length > 0 && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" />
                    {day.photos.length}
                  </span>
                )}
                {day.items.length > 0 && (
                  <span className="text-xs bg-secondary/50 px-2 py-1 rounded-full">
                    {day.items.length} записей
                  </span>
                )}
              </div>
            </div>
          </div>

          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronDown className="w-6 h-6 text-muted-foreground" />
          </motion.div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="px-6 pb-6 space-y-4 border-t">
              {day.note && (
                <div className="mt-4">
                  <h4 className="text-sm font-semibold mb-2">Заметка</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {day.note}
                  </p>
                </div>
              )}

              {day.items.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">События</h4>
                  <div className="space-y-2">
                    {day.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-2 text-sm"
                      >
                        <span className="text-lg">{getItemIcon(item.type)}</span>
                        <div className="flex-1">
                          <p>{item.text}</p>
                          {item.time && (
                            <p className="text-xs text-muted-foreground">
                              {item.time}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {day.photos.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold">
                      Фото ({day.photos.length})
                    </h4>
                    {day.photos.length > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStoriesClick?.(day.photos);
                        }}
                      >
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Смотреть как истории
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {day.photos.slice(0, 8).map((photo) => (
                      <div
                        key={photo.id}
                        className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStoriesClick?.(day.photos);
                        }}
                      >
                        <img
                          src={photo.url.startsWith('http') ? photo.url : mediaApi.getUrl(photo.url)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                  {day.photos.length > 8 && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      +{day.photos.length - 8} еще
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

