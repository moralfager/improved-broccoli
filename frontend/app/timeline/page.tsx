"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, MapPin, Music, Plus, Search, X, CheckCircle } from "lucide-react";
import { calendarApi, plansApi } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface CalendarDay {
  id: number;
  date: string;
  title?: string;
  mood?: string;
  note?: string;
  place?: string;
  tags?: string;
  photos: Photo[];
  musicTrack?: {
    id: number;
    title: string;
    artist?: string;
  };
}

interface Photo {
  id: number;
  path: string;
  order: number;
}

export default function TimelinePage() {
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [filteredDays, setFilteredDays] = useState<CalendarDay[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimeline();
  }, []);

  useEffect(() => {
    filterDays();
  }, [searchQuery, days]);

  const loadTimeline = async () => {
    try {
      setLoading(true);
      const [daysData, plansData] = await Promise.all([
        calendarApi.getDays(),
        plansApi.getAll({ past: true }), // Get all plans including past ones
      ]);
      
      // Only show days with content
      const allDays = daysData.days || [];
      const daysWithContent = allDays.filter((day: CalendarDay) => 
        day.title || day.note || day.photos?.length > 0
      );
      setDays(daysWithContent); // Already in desc order from API
      setPlans(plansData || []);
    } catch (error) {
      console.error('Failed to load timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterDays = () => {
    if (!searchQuery.trim()) {
      setFilteredDays(days);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = days.filter(day =>
      day.title?.toLowerCase().includes(query) ||
      day.note?.toLowerCase().includes(query) ||
      day.place?.toLowerCase().includes(query) ||
      day.tags?.toLowerCase().includes(query)
    );
    setFilteredDays(filtered);
  };

  const getPlansForDay = (date: string) => {
    const dayDate = new Date(date).toDateString();
    return plans.filter(plan => {
      const planDate = new Date(plan.date).toDateString();
      return planDate === dayDate;
    });
  };

  const getMemories = () => {
    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();
    const currentYear = today.getFullYear();
    
    return days.filter(day => {
      const dayDate = new Date(day.date);
      const dayYear = dayDate.getFullYear();
      
      // Same month and day, but from previous years
      return (
        dayDate.getMonth() === todayMonth &&
        dayDate.getDate() === todayDay &&
        dayYear < currentYear
      );
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const groupDaysByTime = () => {
    const grouped: { [key: string]: CalendarDay[] } = {};
    
    filteredDays.forEach(day => {
      const date = new Date(day.date);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      let group = '';
      if (daysDiff === 0) group = 'Сегодня';
      else if (daysDiff === 1) group = 'Вчера';
      else if (daysDiff <= 7) group = 'На этой неделе';
      else if (daysDiff <= 30) group = 'В этом месяце';
      else {
        group = date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
      }
      
      if (!grouped[group]) grouped[group] = [];
      grouped[group].push(day);
    });
    
    return grouped;
  };

  const openStoryViewer = (day: CalendarDay, photoIndex: number = 0) => {
    setSelectedDay(day);
    setCurrentPhotoIndex(photoIndex);
  };

  const closeStoryViewer = () => {
    setSelectedDay(null);
    setCurrentPhotoIndex(0);
  };

  const navigatePhoto = (direction: number) => {
    if (!selectedDay) return;
    const newIndex = currentPhotoIndex + direction;
    if (newIndex >= 0 && newIndex < selectedDay.photos.length) {
      setCurrentPhotoIndex(newIndex);
    }
  };

  const groupedDays = groupDaysByTime();
  const memories = getMemories();

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-3 sm:p-6 pb-20 sm:pb-6">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <h1 className="text-2xl sm:text-3xl font-bold">Лента моментов</h1>
          <Button asChild className="rounded-xl w-full sm:w-auto text-sm sm:text-base">
            <a href="/calendar">
              <Plus className="w-4 h-4 mr-2" />
              Добавить момент
            </a>
          </Button>
        </div>

        {/* Search Bar */}
        <Card className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Поиск по моментам..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 rounded-xl"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>
        </Card>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Загрузка...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredDays.length === 0 && (
          <Card className="p-12 text-center">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold mb-2">Здесь пока пусто</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Ничего не найдено' : 'Начните добавлять свои моменты'}
            </p>
            {!searchQuery && (
              <Button asChild className="rounded-xl">
                <a href="/calendar">
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить первый момент
                </a>
              </Button>
            )}
          </Card>
        )}

        {/* Memories Section */}
        {!loading && !searchQuery && memories.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <Card className="p-4 sm:p-6 bg-gradient-to-r from-purple-100 via-pink-100 to-blue-100 border-2 border-primary/20">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="text-2xl sm:text-3xl">💭</div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold">Воспоминания</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Моменты из этого дня в прошлом
                  </p>
                </div>
              </div>
              
              <div className="space-y-3">
                {memories.map((memory) => {
                  const memoryDate = new Date(memory.date);
                  const yearsAgo = new Date().getFullYear() - memoryDate.getFullYear();
                  
                  return (
                    <motion.div
                      key={memory.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-3 sm:p-4 bg-white/60 backdrop-blur-sm rounded-xl hover:bg-white/80 transition-colors cursor-pointer"
                      onClick={() => memory.photos && memory.photos.length > 0 && openStoryViewer(memory, 0)}
                    >
                      <div className="flex items-start gap-2 sm:gap-3">
                        {memory.photos && memory.photos.length > 0 && (
                          <div className="relative w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden flex-shrink-0">
                            <img
                              src={`${process.env.NEXT_PUBLIC_API_URL}/media/${memory.photos[0].path}`}
                              alt=""
                              className="w-full h-full object-cover"
                              onError={(e) => console.error('Failed to load memory photo:', memory.photos[0].path)}
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 sm:gap-2 mb-1">
                            {memory.mood && <span className="text-base sm:text-lg">{memory.mood}</span>}
                            <span className="font-semibold text-sm sm:text-base">{memory.title}</span>
                          </div>
                          {memory.note && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {memory.note}
                            </p>
                          )}
                          <div className="text-xs text-primary font-medium mt-1">
                            {yearsAgo === 1 ? 'Год назад' : `${yearsAgo} ${yearsAgo >= 2 && yearsAgo <= 4 ? 'года' : 'лет'} назад`} · {memoryDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Timeline */}
        {!loading && Object.entries(groupedDays).map(([group, groupDays]) => (
          <div key={group} className="space-y-4">
            <div className="sticky top-0 z-10 bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 py-2">
              <h2 className="text-lg font-semibold text-muted-foreground">{group}</h2>
            </div>
            
            <div className="space-y-4">
              {groupDays.map((day, index) => (
                <motion.div
                  key={day.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="overflow-hidden hover-glow cursor-pointer">
                    {/* Photos Grid */}
                    {day.photos && day.photos.length > 0 && (
                      <div 
                        className={`grid gap-1 ${
                          day.photos.length === 1 ? 'grid-cols-1' :
                          day.photos.length === 2 ? 'grid-cols-2' :
                          day.photos.length === 3 ? 'grid-cols-3' :
                          'grid-cols-2'
                        }`}
                        onClick={() => openStoryViewer(day, 0)}
                      >
                        {day.photos.slice(0, 4).map((photo, idx) => (
                          <div 
                            key={photo.id}
                            className="relative aspect-square overflow-hidden"
                          >
                            <img
                              src={`${process.env.NEXT_PUBLIC_API_URL}/media/${photo.path}`}
                              alt=""
                              className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                              onError={(e) => console.error('Failed to load photo:', photo.path)}
                            />
                            {idx === 3 && day.photos.length > 4 && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-2xl font-bold">
                                +{day.photos.length - 4}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-4 sm:p-6 space-y-2 sm:space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 sm:gap-3">
                          {day.mood && (
                            <div className="text-2xl sm:text-3xl">{day.mood}</div>
                          )}
                          <div>
                            <div className="font-semibold text-base sm:text-lg">{day.title}</div>
                            <div className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1 sm:gap-2">
                              <Calendar className="w-3 h-3" />
                              {new Date(day.date).toLocaleDateString('ru-RU', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Note */}
                      {day.note && (
                        <p className="text-muted-foreground">{day.note}</p>
                      )}

                      {/* Metadata */}
                      <div className="flex flex-wrap gap-3 text-sm">
                        {day.place && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            {day.place}
                          </div>
                        )}
                        {day.musicTrack && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Music className="w-4 h-4" />
                            {day.musicTrack.title}
                            {day.musicTrack.artist && ` - ${day.musicTrack.artist}`}
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      {day.tags && (
                        <div className="flex flex-wrap gap-2">
                          {day.tags.split(',').map((tag, idx) => (
                            <span 
                              key={idx}
                              className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium"
                            >
                              #{tag.trim()}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Plans for the day */}
                      {(() => {
                        const dayPlans = getPlansForDay(day.date);
                        if (dayPlans.length === 0) return null;
                        
                        return (
                          <div className="space-y-2 border-t pt-3">
                            <div className="text-sm font-semibold text-muted-foreground">
                              Планы дня:
                            </div>
                            {dayPlans.map(plan => (
                              <div 
                                key={plan.id} 
                                className={`flex items-start gap-2 text-sm ${plan.isCompleted ? 'opacity-60' : ''}`}
                              >
                                {plan.isCompleted ? (
                                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <div className="w-4 h-4 rounded-full border-2 border-primary flex-shrink-0 mt-0.5" />
                                )}
                                <div className={`flex-1 ${plan.isCompleted ? 'line-through' : ''}`}>
                                  <div className="font-medium">{plan.title}</div>
                                  {plan.time && (
                                    <div className="text-xs text-muted-foreground">{plan.time}</div>
                                  )}
                                  {plan.location && (
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />
                                      {plan.location}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        ))}

        {/* Story Viewer Modal */}
        <Dialog open={selectedDay !== null} onOpenChange={(open) => !open && closeStoryViewer()}>
          <DialogContent className="h-screen sm:h-[90vh] p-0 bg-black border-none w-screen sm:w-full max-w-full sm:max-w-4xl m-0 sm:m-auto rounded-none sm:rounded-lg">
            <DialogHeader className="sr-only">
              <DialogTitle>Просмотр фотографий</DialogTitle>
              <DialogDescription>
                {selectedDay ? `Фотографии от ${new Date(selectedDay.date).toLocaleDateString('ru-RU')}` : 'Просмотр фотографий'}
              </DialogDescription>
            </DialogHeader>
            {selectedDay && selectedDay.photos && selectedDay.photos.length > 0 && (
              <div className="relative w-full h-full flex items-center justify-center">
                {/* Photo */}
                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentPhotoIndex}
                    src={`${process.env.NEXT_PUBLIC_API_URL}/media/${selectedDay.photos[currentPhotoIndex].path}`}
                    alt=""
                    className="max-w-full max-h-full object-contain pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    onError={(e) => console.error('Failed to load photo:', selectedDay.photos[currentPhotoIndex].path)}
                  />
                </AnimatePresence>

                {/* Navigation */}
                {currentPhotoIndex > 0 && (
                  <button
                    onClick={() => navigatePhoto(-1)}
                    className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors z-10"
                  >
                    ‹
                  </button>
                )}
                {currentPhotoIndex < selectedDay.photos.length - 1 && (
                  <button
                    onClick={() => navigatePhoto(1)}
                    className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors z-10"
                  >
                    ›
                  </button>
                )}

                {/* Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 sm:p-6 text-white pointer-events-none">
                  <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                    {selectedDay.mood && (
                      <div className="text-xl sm:text-2xl">{selectedDay.mood}</div>
                    )}
                    <div>
                      <div className="font-semibold text-sm sm:text-base">{selectedDay.title}</div>
                      <div className="text-xs sm:text-sm opacity-80">
                        {new Date(selectedDay.date).toLocaleDateString('ru-RU', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>
                  {selectedDay.note && (
                    <p className="text-xs sm:text-sm opacity-90 line-clamp-2 sm:line-clamp-3">{selectedDay.note}</p>
                  )}
                  <div className="text-xs opacity-70 mt-1 sm:mt-2">
                    {currentPhotoIndex + 1} / {selectedDay.photos.length}
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={closeStoryViewer}
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors z-10 pointer-events-auto"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

