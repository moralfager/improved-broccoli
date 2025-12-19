"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/auth.store";
import { plansApi, importantDatesApi, calendarApi } from "@/lib/api";
import { MoodPicker } from "@/components/shared/mood-picker";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Clock, Heart, Plus, Sparkles, Settings, Mail, LogOut, Image, Grid3x3, List, ChevronLeft, ChevronRight, X } from "lucide-react";
import Link from "next/link";

interface Photo {
  id: number;
  path: string;
  order: number;
  dayId: number;
  day?: {
    date: string;
    title?: string;
  };
}

export default function Home() {
  const { isAuthenticated, clearAuth } = useAuthStore();
  const router = useRouter();
  const [mood, setMood] = useState<string>("");
  const [todayPlans, setTodayPlans] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMoodDialog, setShowMoodDialog] = useState(false);
  const [savingMood, setSavingMood] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [galleryView, setGalleryView] = useState<'grid' | 'carousel'>('grid');
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    const todayKey = new Date().toDateString();
    
    // Load mood from localStorage
    const savedMood = localStorage.getItem(`mood-${todayKey}`);
    if (savedMood) {
      setMood(savedMood);
    } else {
      // Show mood dialog if not set today
      const lastPrompt = localStorage.getItem('last-mood-prompt');
      if (lastPrompt !== todayKey) {
        // Delay to make it feel more natural
        setTimeout(() => setShowMoodDialog(true), 1000);
      }
    }

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [plans, dates] = await Promise.all([
        plansApi.getToday(),
        importantDatesApi.getUpcoming(5),
      ]);
      setTodayPlans(plans);
      setUpcomingEvents(dates);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMoodSelect = (selectedMood: string) => {
    setMood(selectedMood);
    const todayKey = new Date().toDateString();
    localStorage.setItem(`mood-${todayKey}`, selectedMood);
  };

  const handleMoodDialogSelect = async (selectedMood: string) => {
    setSavingMood(true);
    try {
      const todayKey = new Date().toDateString();
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      // Save to backend
      await calendarApi.createOrUpdateDay({
        date: dateStr,
        mood: selectedMood,
      });
      
      // Save to localStorage
      setMood(selectedMood);
      localStorage.setItem(`mood-${todayKey}`, selectedMood);
      localStorage.setItem('last-mood-prompt', todayKey);
      
      setShowMoodDialog(false);
    } catch (error) {
      console.error('Failed to save mood:', error);
      alert('Ошибка сохранения настроения');
    } finally {
      setSavingMood(false);
    }
  };

  const loadAllPhotos = async () => {
    try {
      setLoadingPhotos(true);
      const response = await calendarApi.getDays(1, 1000); // Get all days
      const photos: Photo[] = [];
      
      response.days.forEach((day: any) => {
        if (day.photos && day.photos.length > 0) {
          day.photos.forEach((photo: any) => {
            photos.push({
              ...photo,
              dayId: day.id,
              day: {
                date: day.date,
                title: day.title,
              },
            });
          });
        }
      });
      
      // Sort by date (newest first)
      photos.sort((a, b) => {
        const dateA = new Date(a.day?.date || 0).getTime();
        const dateB = new Date(b.day?.date || 0).getTime();
        return dateB - dateA;
      });
      
      setAllPhotos(photos);
    } catch (error) {
      console.error('Failed to load photos:', error);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const handleOpenGallery = async () => {
    setShowGallery(true);
    if (allPhotos.length === 0) {
      await loadAllPhotos();
    }
  };

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  const navigatePhoto = useCallback((direction: number) => {
    if (galleryView === 'carousel') {
      setCurrentPhotoIndex((prev) => {
        const newIndex = prev + direction;
        if (newIndex < 0) return allPhotos.length - 1;
        if (newIndex >= allPhotos.length) return 0;
        return newIndex;
      });
    }
  }, [galleryView, allPhotos.length]);

  // Keyboard navigation for carousel
  useEffect(() => {
    if (!showGallery || galleryView !== 'carousel') return;

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        navigatePhoto(-1);
      } else if (e.key === 'ArrowRight') {
        navigatePhoto(1);
      } else if (e.key === 'Escape') {
        setShowGallery(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showGallery, galleryView, navigatePhoto]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  const today = new Date();
  const dayOfWeek = today.toLocaleDateString('ru-RU', { weekday: 'long' });
  const date = today.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-3 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-1 sm:space-y-2"
        >
          <h1 className="text-3xl sm:text-5xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            Zh.A. & You
          </h1>
          <div className="text-xs sm:text-sm text-muted-foreground capitalize">{dayOfWeek}</div>
          <div className="text-lg sm:text-2xl font-semibold">{date}</div>
        </motion.div>

        {/* Mood Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-4 sm:p-6 soft-shadow">
            <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-center">Настроение дня</h2>
            {mood ? (
              <div className="text-center">
                <div className="text-4xl sm:text-6xl mb-2 sm:mb-3">{mood}</div>
                <button
                  onClick={() => setMood("")}
                  className="text-xs sm:text-sm text-muted-foreground hover:text-foreground"
                >
                  Изменить
                </button>
              </div>
            ) : (
              <MoodPicker selected={mood} onSelect={handleMoodSelect} />
            )}
          </Card>
        </motion.div>

        {/* Today's Plans */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-4 sm:p-6 soft-shadow">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                Планы на сегодня
              </h2>
              <Link href="/plans">
                <button className="text-xs sm:text-sm text-primary hover:underline">Все планы</button>
              </Link>
            </div>
            {todayPlans.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Нет планов на сегодня</p>
            ) : (
              <div className="space-y-3">
                {todayPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="text-2xl">{getTypeIcon(plan.type)}</div>
                    <div className="flex-1">
                      <div className="font-medium">{plan.title}</div>
                      {plan.time && (
                        <div className="text-sm text-muted-foreground">{plan.time}</div>
                      )}
                      {plan.location && (
                        <div className="text-sm text-muted-foreground">📍 {plan.location}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Upcoming Events */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-4 sm:p-6 soft-shadow">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                Ближайшие события
              </h2>
              <Link href="/dates">
                <button className="text-xs sm:text-sm text-primary hover:underline">Все даты</button>
              </Link>
            </div>
            {upcomingEvents.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Нет предстоящих событий</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event: any) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r from-pink-50 to-purple-50"
                  >
                    <CalendarIcon className="w-5 h-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <div className="font-medium">{event.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {event.daysUntil === 0 
                          ? "Сегодня!" 
                          : `Через ${event.daysUntil} ${getDaysWord(event.daysUntil)}`
                        }
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4"
        >
          <Link href="/calendar">
            <Card className="p-4 sm:p-6 text-center hover-glow cursor-pointer">
              <CalendarIcon className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-primary" />
              <div className="font-medium text-sm sm:text-base">Календарь</div>
            </Card>
          </Link>
          <Link href="/plans">
            <Card className="p-4 sm:p-6 text-center hover-glow cursor-pointer">
              <Plus className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-primary" />
              <div className="font-medium text-sm sm:text-base">Добавить план</div>
            </Card>
          </Link>
          <Card 
            onClick={handleOpenGallery}
            className="p-4 sm:p-6 text-center hover-glow cursor-pointer"
          >
            <Image className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-primary" />
            <div className="font-medium text-sm sm:text-base">Смотреть фото</div>
          </Card>
        </motion.div>

        {/* Additional Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4"
        >
          <Link href="/letters">
            <Button variant="outline" className="w-full rounded-xl gap-2">
              <Mail className="w-4 h-4" />
              Письма
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="outline" className="w-full rounded-xl gap-2">
              <Settings className="w-4 h-4" />
              Настройки
            </Button>
          </Link>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="w-full rounded-xl gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="w-4 h-4" />
            Выйти
          </Button>
        </motion.div>
      </div>

      {/* Daily Mood Dialog */}
      <Dialog open={showMoodDialog} onOpenChange={setShowMoodDialog}>
        <DialogContent className="w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center flex items-center justify-center gap-2 text-base sm:text-lg">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              Как ваше настроение сегодня?
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3 sm:space-y-4">
            <p className="text-xs sm:text-sm text-muted-foreground text-center">
              Выберите настроение, чтобы отметить начало дня
            </p>
            
            <div className="grid grid-cols-4 gap-2 sm:gap-3">
              {['😊', '😍', '🥰', '😄', '😎', '🤗', '😌', '🎉', '💕', '✨', '🌸', '🌺', '🥳', '😇', '🤩', '😋'].map((emoji) => (
                <motion.button
                  key={emoji}
                  onClick={() => handleMoodDialogSelect(emoji)}
                  disabled={savingMood}
                  className="text-3xl sm:text-4xl p-2 sm:p-3 rounded-xl transition-all hover:scale-110 hover:bg-muted disabled:opacity-50"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {emoji}
                </motion.button>
              ))}
            </div>
            
            {savingMood && (
              <div className="text-center text-sm text-muted-foreground">
                Сохранение...
              </div>
            )}
            
            <button
              onClick={() => {
                const todayKey = new Date().toDateString();
                localStorage.setItem('last-mood-prompt', todayKey);
                setShowMoodDialog(false);
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors text-center w-full"
            >
              Пропустить
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Photo Gallery */}
      <Dialog open={showGallery} onOpenChange={setShowGallery}>
        <DialogContent className="w-[95vw] sm:w-full max-w-6xl h-[90vh] sm:h-[85vh] p-0 flex flex-col">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base sm:text-lg">Галерея фото</DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setGalleryView(galleryView === 'grid' ? 'carousel' : 'grid')}
                  className="rounded-xl"
                >
                  {galleryView === 'grid' ? (
                    <List className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <Grid3x3 className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowGallery(false)}
                  className="rounded-xl"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </Button>
              </div>
            </div>
            <DialogDescription className="text-xs sm:text-sm">
              {allPhotos.length} {allPhotos.length === 1 ? 'фото' : allPhotos.length < 5 ? 'фото' : 'фотографий'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {loadingPhotos ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground text-sm">Загрузка фото...</p>
                </div>
              </div>
            ) : allPhotos.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Image className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Нет загруженных фото</p>
                </div>
              </div>
            ) : galleryView === 'grid' ? (
              <div className="h-full overflow-y-auto p-4 sm:p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                  {allPhotos.map((photo, index) => (
                    <motion.div
                      key={photo.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="relative aspect-square group cursor-pointer"
                      onClick={() => {
                        setCurrentPhotoIndex(index);
                        setGalleryView('carousel');
                      }}
                    >
                      <img
                        src={`${process.env.NEXT_PUBLIC_API_URL}/media/${photo.path}`}
                        alt=""
                        className="w-full h-full object-cover rounded-lg hover:opacity-90 transition-opacity"
                        onError={(e) => console.error('Failed to load photo:', photo.path)}
                      />
                      {photo.day?.title && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-white text-xs truncate">{photo.day.title}</p>
                          <p className="text-white/80 text-xs">
                            {new Date(photo.day.date).toLocaleDateString('ru-RU', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="relative h-full flex items-center justify-center bg-black">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentPhotoIndex}
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.3 }}
                    className="relative w-full h-full flex items-center justify-center"
                  >
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_URL}/media/${allPhotos[currentPhotoIndex].path}`}
                      alt=""
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => console.error('Failed to load photo:', allPhotos[currentPhotoIndex].path)}
                    />
                    
                    {/* Photo Info */}
                    {allPhotos[currentPhotoIndex].day && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 sm:p-6 text-white">
                        {allPhotos[currentPhotoIndex].day?.title && (
                          <div className="font-semibold text-sm sm:text-base mb-1">
                            {allPhotos[currentPhotoIndex].day.title}
                          </div>
                        )}
                        <div className="text-xs sm:text-sm opacity-80">
                          {new Date(allPhotos[currentPhotoIndex].day?.date || '').toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="text-xs opacity-70 mt-1">
                          {currentPhotoIndex + 1} / {allPhotos.length}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>

                {/* Navigation Arrows */}
                {allPhotos.length > 1 && (
                  <>
                    <button
                      onClick={() => navigatePhoto(-1)}
                      className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors z-10"
                    >
                      <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                    <button
                      onClick={() => navigatePhoto(1)}
                      className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors z-10"
                    >
                      <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                  </>
                )}

                {/* Thumbnail Strip */}
                {allPhotos.length > 1 && (
                  <div className="absolute bottom-16 sm:bottom-20 left-0 right-0 overflow-x-auto px-4 sm:px-6 pb-2">
                    <div className="flex gap-2 justify-center">
                      {allPhotos.slice(Math.max(0, currentPhotoIndex - 5), Math.min(allPhotos.length, currentPhotoIndex + 6)).map((photo, idx) => {
                        const actualIndex = Math.max(0, currentPhotoIndex - 5) + idx;
                        return (
                          <button
                            key={photo.id}
                            onClick={() => setCurrentPhotoIndex(actualIndex)}
                            className={`relative w-12 h-12 sm:w-16 sm:h-16 rounded-lg overflow-hidden flex-shrink-0 transition-all ${
                              actualIndex === currentPhotoIndex ? 'ring-2 ring-white scale-110' : 'opacity-60 hover:opacity-100'
                            }`}
                          >
                            <img
                              src={`${process.env.NEXT_PUBLIC_API_URL}/media/${photo.path}`}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    'прогулка': '🚶',
    'кафе': '☕',
    'кино': '🎬',
    'дом': '🏠',
    'подарок': '🎁',
    'праздник': '🎉',
    'поездка': '✈️',
  };
  return icons[type] || '📌';
}

function getDaysWord(days: number): string {
  if (days === 1) return 'день';
  if (days >= 2 && days <= 4) return 'дня';
  return 'дней';
}

