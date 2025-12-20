"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus, X, Upload, Trash2, Eye, Camera, CheckCircle, Pencil } from "lucide-react";
import { calendarApi, periodsApi, plansApi, importantDatesApi, mediaApi } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PeriodVisualizer, PeriodLegend } from "@/components/shared/period-visualizer";

interface CalendarDay {
  id?: number;
  date: string;
  title?: string;
  mood?: string;
  note?: string;
  photos?: any[];
  hasEvent?: boolean;
  hasPlan?: boolean;
}

interface Period {
  id: number;
  name: string;
  startDate: string;
  endDate?: string;
  color: string;
  order: number;
}

interface ImportantDate {
  id: number;
  date: string;
  title: string;
  description?: string;
  category: string;
  isAnnual: boolean;
}

type ViewMode = "month" | "week" | "day";

const CATEGORY_EMOJIS: { [key: string]: string } = {
  'знакомство': '👋',
  'первая прогулка': '🚶',
  'её события': '💝',
  'твои события': '💙',
  'годовщина': '💕',
  'другое': '⭐',
};

const MOOD_EMOJIS = ['😊', '😍', '🥰', '😄', '😎', '🤗', '😌', '🎉', '💕', '✨', '🌸', '🌺'];

// Утилиты для отслеживания просмотров историй
const getViewedStories = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  const stored = localStorage.getItem('viewedStories');
  return new Set(stored ? JSON.parse(stored) : []);
};

const markStoryAsViewed = (dateStr: string) => {
  const viewed = getViewedStories();
  viewed.add(dateStr);
  localStorage.setItem('viewedStories', JSON.stringify(Array.from(viewed)));
};

const isStoryViewed = (dateStr: string): boolean => {
  return getViewedStories().has(dateStr);
};

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarDays, setCalendarDays] = useState<Map<string, CalendarDay>>(new Map());
  const [periods, setPeriods] = useState<Period[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [importantDates, setImportantDates] = useState<ImportantDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [storyDate, setStoryDate] = useState<Date | null>(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentDate, viewMode]);

  // Helper to get local date string without timezone conversion
  const getLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const startDate = getStartDate();
      const endDate = getEndDate();
      
      const [daysResponse, periodsData, plansData, datesData] = await Promise.all([
        calendarApi.getDaysByDateRange(startDate.toISOString(), endDate.toISOString()),
        periodsApi.getAll(),
        plansApi.getUpcoming(30),
        importantDatesApi.getAll(),
      ]);

      const daysMap = new Map<string, CalendarDay>();
      daysResponse.days.forEach((day: CalendarDay) => {
        const dayDate = new Date(day.date);
        const localDateStr = getLocalDateString(dayDate);
        daysMap.set(localDateStr, day);
      });
      setCalendarDays(daysMap);
      setPeriods(periodsData.sort((a: Period, b: Period) => a.order - b.order));
      setPlans(plansData);
      setImportantDates(datesData);
    } catch (error) {
      console.error('Failed to load calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStartDate = () => {
    if (viewMode === "month") {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      // Get Monday of the week containing the first day of the month
      const day = start.getDay();
      const diff = day === 0 ? -6 : 1 - day; // If Sunday, go back 6 days, else go back to Monday
      start.setDate(start.getDate() + diff);
      return start;
    } else if (viewMode === "week") {
      const start = new Date(currentDate);
      const day = start.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + diff);
      return start;
    } else {
      return currentDate;
    }
  };

  const getEndDate = () => {
    if (viewMode === "month") {
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      // Get Sunday of the week containing the last day of the month
      const day = end.getDay();
      const diff = day === 0 ? 0 : 7 - day;
      end.setDate(end.getDate() + diff);
      return end;
    } else if (viewMode === "week") {
      const end = new Date(currentDate);
      const day = end.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      end.setDate(end.getDate() + diff + 6);
      return end;
    } else {
      return currentDate;
    }
  };

  const navigate = (direction: number) => {
    const newDate = new Date(currentDate);
    if (viewMode === "month") {
      newDate.setMonth(newDate.getMonth() + direction);
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else {
      newDate.setDate(newDate.getDate() + direction);
    }
    setCurrentDate(newDate);
  };

  const getPeriodColor = (date: Date): string => {
    for (const period of periods) {
      const start = new Date(period.startDate);
      const end = period.endDate ? new Date(period.endDate) : new Date('2099-12-31');
      if (date >= start && date <= end) {
        return period.color;
      }
    }
    return '#f3f4f6';
  };

  const hasDataForDate = (date: Date): boolean => {
    const dateStr = getLocalDateString(date);
    return calendarDays.has(dateStr) || plans.some(p => {
      const planDate = new Date(p.date);
      return getLocalDateString(planDate) === dateStr;
    });
  };

  const getDayData = (date: Date) => {
    const dateStr = getLocalDateString(date);
    return calendarDays.get(dateStr);
  };

  const getDayPlans = (date: Date) => {
    const dateStr = getLocalDateString(date);
    return plans.filter(p => {
      const planDate = new Date(p.date);
      return getLocalDateString(planDate) === dateStr;
    });
  };

  const getImportantDatesForDay = (date: Date): ImportantDate[] => {
    return importantDates.filter(d => {
      const importantDate = new Date(d.date);
      if (d.isAnnual) {
        // For annual dates, only compare month and day
        return date.getMonth() === importantDate.getMonth() && date.getDate() === importantDate.getDate();
      }
      return getLocalDateString(date) === getLocalDateString(importantDate);
    });
  };

  const renderCalendar = () => {
    if (viewMode === "month") {
      return <MonthView />;
    } else if (viewMode === "week") {
      return <WeekView />;
    } else {
      return <DayView />;
    }
  };

  const MonthView = () => {
    const startDate = getStartDate();
    const days = [];
    const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
    const [isLongPress, setIsLongPress] = useState(false);
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      days.push(date);
    }

    const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

    const handleDayPress = (date: Date, hasPhotos: boolean) => {
      const timer = setTimeout(() => {
        setIsLongPress(true);
      }, 500);
      setLongPressTimer(timer);
    };

    const handleDayRelease = (date: Date, hasPhotos: boolean) => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }

      if (isLongPress) {
        // Long press - открываем модальное окно редактирования
        setIsLongPress(false);
        setSelectedDate(date);
      } else {
        // Short press - если есть фото, открываем историю, иначе показываем просмотр дня
        if (hasPhotos) {
          setStoryDate(date);
          setShowStoryViewer(true);
        } else {
          // Показываем просмотр дня (не редактирование)
          const dayData = getDayData(date);
          const dayPlans = getDayPlans(date);
          const dayImportantDates = getImportantDatesForDay(date);
          const isEmpty = !dayData && dayPlans.length === 0 && dayImportantDates.length === 0;
          
          setSelectedDate(date);
          // Если день пустой, сразу открываем редактирование
          setEditMode(isEmpty);
        }
      }
    };

    return (
      <div className="space-y-1 sm:space-y-2">
        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1 sm:mb-2">
          {weekDays.map((day, i) => (
            <div key={i} className="text-center text-xs sm:text-sm font-medium text-muted-foreground py-1 sm:py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {days.map((date, i) => {
            const isCurrentMonth = date.getMonth() === currentDate.getMonth();
            const isToday = date.toDateString() === new Date().toDateString();
            const hasData = hasDataForDate(date);
            const periodColor = getPeriodColor(date);
            const dayData = getDayData(date);
            const dayImportantDates = getImportantDatesForDay(date);
            const dateStr = getLocalDateString(date);
            const hasPhotos = (dayData?.photos?.length ?? 0) > 0;
            const viewed = isStoryViewed(dateStr);
            
            return (
              <motion.button
                key={i}
                onMouseDown={() => handleDayPress(date, hasPhotos)}
                onMouseUp={() => handleDayRelease(date, hasPhotos)}
                onMouseLeave={() => {
                  if (longPressTimer) {
                    clearTimeout(longPressTimer);
                    setLongPressTimer(null);
                  }
                  setIsLongPress(false);
                }}
                onTouchStart={() => handleDayPress(date, hasPhotos)}
                onTouchEnd={() => handleDayRelease(date, hasPhotos)}
                className={`aspect-square rounded-xl sm:rounded-2xl p-1 sm:p-2 relative overflow-hidden transition-all ${
                  isCurrentMonth ? 'opacity-100' : 'opacity-40'
                } ${isToday ? 'ring-1 sm:ring-2 ring-primary' : ''} hover:scale-105 ${
                  hasPhotos && !viewed ? 'ring-1 sm:ring-2 ring-gradient-to-r from-pink-500 via-purple-500 to-blue-500' : ''
                } ${hasPhotos && viewed ? 'ring-1 sm:ring-2 ring-gray-400' : ''}`}
                style={{ 
                  backgroundColor: periodColor,
                  ...(hasPhotos && !viewed && {
                    boxShadow: '0 0 0 2px transparent, 0 0 0 4px rgba(236, 72, 153, 0.3)',
                    background: `linear-gradient(${periodColor}, ${periodColor}) padding-box, linear-gradient(45deg, #ec4899, #a855f7, #3b82f6) border-box`,
                    border: '2px solid transparent',
                  })
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className={`text-xs sm:text-sm font-medium ${
                  isCurrentMonth ? 'text-gray-900' : 'text-gray-600'
                }`}>
                  {date.getDate()}
                </div>
                {hasPhotos && (
                  <Camera className={`absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 ${viewed ? 'text-gray-400' : 'text-pink-500'}`} />
                )}
                {(hasData || dayImportantDates.length > 0 || getDayPlans(date).length > 0) && (
                  <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-0.5 items-center">
                    {dayData?.mood && (
                      <div className="text-xs">{dayData.mood}</div>
                    )}
                    {dayData && !hasPhotos && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                    )}
                    {dayImportantDates.length > 0 && (
                      <div className="text-xs">
                        {dayImportantDates.map(d => CATEGORY_EMOJIS[d.category] || '⭐').join('')}
                      </div>
                    )}
                    {getDayPlans(date).some((p: any) => p.isCompleted) && (
                      <CheckCircle className="w-3 h-3 text-green-500" />
                    )}
                    {getDayPlans(date).some((p: any) => !p.isCompleted) && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                    )}
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  };

  const WeekView = () => {
    const startDate = getStartDate();
    const days = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      days.push(date);
    }

    const weekDays = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

    return (
      <div className="space-y-3">
        {days.map((date, i) => {
          const isToday = date.toDateString() === new Date().toDateString();
          const periodColor = getPeriodColor(date);
          const dayData = getDayData(date);
          const dayPlans = getDayPlans(date);
          
          return (
            <motion.div
              key={i}
              onClick={() => setSelectedDate(date)}
              className={`p-4 rounded-2xl cursor-pointer hover:scale-[1.02] transition-transform ${
                isToday ? 'ring-2 ring-primary' : ''
              }`}
              style={{ backgroundColor: periodColor }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm text-muted-foreground">{weekDays[date.getDay()]}</div>
                  <div className="text-2xl font-bold">{date.getDate()}</div>
                </div>
                {dayData?.mood && (
                  <div className="text-4xl">{dayData.mood}</div>
                )}
              </div>
              {dayData?.title && (
                <div className="text-sm font-medium mb-1">{dayData.title}</div>
              )}
              {dayPlans.length > 0 && (
                <div className="space-y-1">
                  {dayPlans.map((plan: any) => (
                    <div key={plan.id} className={`text-xs bg-white/50 px-2 py-1 rounded flex items-center gap-1 ${plan.isCompleted ? 'opacity-60 line-through' : ''}`}>
                      {plan.isCompleted && <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />}
                      <span>{plan.time} - {plan.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    );
  };

  const DayView = () => {
    const dayData = getDayData(currentDate);
    const dayPlans = getDayPlans(currentDate);
    const periodColor = getPeriodColor(currentDate);

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-4"
      >
        <Card className="p-6" style={{ backgroundColor: periodColor }}>
          <div className="text-center mb-4">
            <div className="text-4xl font-bold mb-2">{currentDate.getDate()}</div>
            <div className="text-muted-foreground">
              {currentDate.toLocaleDateString('ru-RU', { weekday: 'long', month: 'long', year: 'numeric' })}
            </div>
          </div>
          
          {dayData?.mood && (
            <div className="text-center text-6xl mb-4">{dayData.mood}</div>
          )}
          
          {dayData?.title && (
            <h3 className="text-xl font-semibold mb-2">{dayData.title}</h3>
          )}
          
          {dayData?.note && (
            <p className="text-muted-foreground mb-4">{dayData.note}</p>
          )}
          
          {dayData?.photos && dayData.photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              {dayData.photos.map((photo: any) => (
                <img 
                  key={photo.id}
                  src={`${process.env.NEXT_PUBLIC_API_URL}/media/${photo.path}`}
                  alt=""
                  className="w-full aspect-square object-cover rounded-lg"
                  onError={(e) => console.error('Failed to load photo:', photo.path)}
                />
              ))}
            </div>
          )}
        </Card>

        {dayPlans.length > 0 && (
          <Card className="p-6">
            <h3 className="font-semibold mb-3">Планы на этот день</h3>
            <div className="space-y-2">
              {dayPlans.map((plan: any) => (
                <div key={plan.id} className={`p-3 rounded-lg bg-muted/30 ${plan.isCompleted ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-2">
                    {plan.isCompleted && <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />}
                    <div className={`flex-1 ${plan.isCompleted ? 'line-through' : ''}`}>
                      <div className="font-medium">{plan.title}</div>
                      {plan.time && <div className="text-sm text-muted-foreground">{plan.time}</div>}
                      {plan.location && <div className="text-sm text-muted-foreground">📍 {plan.location}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-3 sm:p-6">
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <h1 className="text-2xl sm:text-3xl font-bold">Календарь</h1>
          <div className="flex gap-1 sm:gap-2 w-full sm:w-auto">
            <Button
              variant={viewMode === "month" ? "default" : "outline"}
              onClick={() => setViewMode("month")}
              className="rounded-xl text-xs sm:text-sm flex-1 sm:flex-initial"
            >
              Месяц
            </Button>
            <Button
              variant={viewMode === "week" ? "default" : "outline"}
              onClick={() => setViewMode("week")}
              className="rounded-xl text-xs sm:text-sm flex-1 sm:flex-initial"
            >
              Неделя
            </Button>
            <Button
              variant={viewMode === "day" ? "default" : "outline"}
              onClick={() => setViewMode("day")}
              className="rounded-xl text-xs sm:text-sm flex-1 sm:flex-initial"
            >
              День
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <Card className="p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-xl"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            
            <div className="text-base sm:text-xl font-semibold text-center px-2">
              {viewMode === "month" && currentDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
              {viewMode === "week" && `${getStartDate().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} - ${getEndDate().toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}`}
              {viewMode === "day" && currentDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(1)}
              className="rounded-xl"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </Card>

        {/* Period Legend */}
        {periods.length > 0 && (
          <Card className="p-4">
            <PeriodLegend periods={periods} />
          </Card>
        )}

        {/* Calendar View */}
        <Card className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Загрузка...</p>
            </div>
          ) : (
            renderCalendar()
          )}
        </Card>

        {/* Day View/Edit Modal */}
        <Dialog open={selectedDate !== null} onOpenChange={() => {
          setSelectedDate(null);
          setEditMode(false);
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
            {selectedDate && (() => {
              const dayData = getDayData(selectedDate);
              const dayPlans = getDayPlans(selectedDate);
              const dayImportantDates = getImportantDatesForDay(selectedDate);
              
              return (
                <>
                  <DialogHeader>
                    <DialogTitle>
                      {editMode ? (dayData ? 'Изменить день' : 'Добавить момент') : (dayData?.title || 'День')}
                    </DialogTitle>
                    <DialogDescription>
                      {selectedDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </DialogDescription>
                  </DialogHeader>
                  {editMode ? (
                    <DayDetailModal 
                      date={selectedDate} 
                      dayData={dayData} 
                      onClose={() => {
                        setSelectedDate(null);
                        setEditMode(false);
                        loadData();
                      }}
                      onViewStory={() => {
                        if (dayData?.photos && dayData.photos.length > 0) {
                          setStoryDate(selectedDate);
                          setShowStoryViewer(true);
                          setSelectedDate(null);
                          setEditMode(false);
                        }
                      }}
                    />
                  ) : (
                    <DayViewModal 
                      date={selectedDate} 
                      dayData={dayData}
                      dayPlans={dayPlans}
                      dayImportantDates={dayImportantDates}
                      onClose={() => {
                        setSelectedDate(null);
                        setEditMode(false);
                      }}
                      onEdit={() => {
                        setEditMode(true);
                      }}
                      onViewStory={() => {
                        if (dayData?.photos && dayData.photos.length > 0) {
                          setStoryDate(selectedDate);
                          setShowStoryViewer(true);
                          setSelectedDate(null);
                          setEditMode(false);
                        }
                      }}
                    />
                  )}
                </>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Story Viewer */}
        {showStoryViewer && storyDate && (
          <StoryViewer 
            date={storyDate}
            dayData={getDayData(storyDate)}
            onClose={() => {
              setShowStoryViewer(false);
              setStoryDate(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

function DayViewModal({ 
  date, 
  dayData,
  dayPlans,
  dayImportantDates,
  onClose, 
  onEdit,
  onViewStory 
}: { 
  date: Date; 
  dayData?: CalendarDay;
  dayPlans: any[];
  dayImportantDates: ImportantDate[];
  onClose: () => void;
  onEdit: () => void;
  onViewStory: () => void;
}) {
  const hasPhotos = (dayData?.photos?.length ?? 0) > 0;

  return (
    <div className="space-y-4">
      {/* Mood */}
      {dayData?.mood && (
        <div className="text-center">
          <div className="text-6xl mb-2">{dayData.mood}</div>
        </div>
      )}

      {/* Title */}
      {dayData?.title && (
        <div>
          <h3 className="text-xl font-semibold">{dayData.title}</h3>
        </div>
      )}

      {/* Note */}
      {dayData?.note && (
        <div>
          <p className="text-muted-foreground whitespace-pre-wrap">{dayData.note}</p>
        </div>
      )}

      {/* Photos */}
      {hasPhotos && (
        <div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {dayData?.photos?.slice(0, 3).map((photo: any) => (
              <img
                key={photo.id}
                src={`${process.env.NEXT_PUBLIC_API_URL}/media/${photo.path}`}
                alt=""
                className="w-full aspect-square object-cover rounded-lg"
                onError={(e) => console.error('Failed to load photo:', photo.path)}
              />
            ))}
          </div>
          <Button
            onClick={onViewStory}
            className="w-full rounded-xl gap-2 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:opacity-90"
          >
            <Eye className="w-4 h-4" />
            Смотреть как историю ({dayData?.photos?.length ?? 0} фото)
          </Button>
        </div>
      )}

      {/* Important Dates */}
      {dayImportantDates.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">Важные события</h4>
          <div className="space-y-2">
            {dayImportantDates.map((event) => (
              <div key={event.id} className="p-3 rounded-lg bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{CATEGORY_EMOJIS[event.category] || '⭐'}</span>
                  <div>
                    <div className="font-medium">{event.title}</div>
                    {event.description && (
                      <div className="text-sm text-muted-foreground">{event.description}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Plans */}
      {dayPlans.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2">Планы</h4>
          <div className="space-y-2">
            {dayPlans.map((plan: any) => (
              <div key={plan.id} className={`p-3 rounded-lg bg-muted/30 ${plan.isCompleted ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-2">
                  {plan.isCompleted && <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />}
                  <div className={`flex-1 ${plan.isCompleted ? 'line-through' : ''}`}>
                    <div className="font-medium">{plan.title}</div>
                    {plan.time && <div className="text-sm text-muted-foreground">{plan.time}</div>}
                    {plan.location && <div className="text-sm text-muted-foreground">📍 {plan.location}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!dayData && dayPlans.length === 0 && dayImportantDates.length === 0 && (
        <div className="text-center text-muted-foreground py-8">
          <p>Нет данных за этот день</p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onClose}
          className="flex-1 rounded-xl"
        >
          Закрыть
        </Button>
        <Button
          onClick={onEdit}
          className="flex-1 rounded-xl gap-2"
        >
          <Pencil className="w-4 h-4" />
          Редактировать
        </Button>
      </div>
    </div>
  );
}

function DayDetailModal({ 
  date, 
  dayData, 
  onClose, 
  onViewStory 
}: { 
  date: Date; 
  dayData?: CalendarDay; 
  onClose: () => void;
  onViewStory: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    title: dayData?.title || '',
    mood: dayData?.mood || '',
    note: dayData?.note || '',
  });
  const [photos, setPhotos] = useState<any[]>(dayData?.photos || []);
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);

  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      for (const file of files) {
        const uploadedPhoto = await mediaApi.upload(file, dateStr, photos.length);
        setPhotos(prev => [...prev, uploadedPhoto]);
      }
    } catch (error) {
      console.error('Failed to upload photos:', error);
      alert('Ошибка загрузки фото');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId: number) => {
    if (!confirm('Удалить это фото?')) return;
    
    try {
      await mediaApi.delete(photoId);
      setPhotos(prev => prev.filter(p => p.id !== photoId));
    } catch (error) {
      console.error('Failed to delete photo:', error);
      alert('Ошибка удаления фото');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await calendarApi.createOrUpdateDay({
        date: dateStr,
        title: formData.title,
        mood: formData.mood,
        note: formData.note,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save day:', error);
      alert('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Удалить все данные за этот день? Это действие нельзя отменить.')) return;
    
    setDeleting(true);
    try {
      await calendarApi.deleteDay(dateStr);
      onClose();
    } catch (error) {
      console.error('Failed to delete day:', error);
      alert('Ошибка удаления дня');
    } finally {
      setDeleting(false);
    }
  };

  const hasPhotos = (photos?.length ?? 0) > 0;

  return (
    <div className="space-y-4">
      {/* View Story Button */}
      {hasPhotos && (
        <Button
          onClick={onViewStory}
          className="w-full rounded-xl gap-2 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 hover:opacity-90"
        >
          <Eye className="w-4 h-4" />
          Смотреть как историю ({photos.length} фото)
        </Button>
      )}

      {/* Form */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Название дня</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Например: Прогулка в парке"
            className="mt-1"
          />
        </div>

        <div>
          <Label>Настроение</Label>
          <div className="grid grid-cols-6 gap-1 sm:gap-2 mt-2">
            {MOOD_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setFormData({ ...formData, mood: emoji })}
                className={`text-2xl sm:text-3xl p-1 sm:p-2 rounded-lg transition-all hover:scale-110 ${
                  formData.mood === emoji ? 'bg-primary/20 scale-110' : 'hover:bg-muted'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="note">Заметки</Label>
          <Textarea
            id="note"
            value={formData.note}
            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            placeholder="Расскажите о вашем дне..."
            className="mt-1 min-h-[100px]"
          />
        </div>

        {/* Photo Upload */}
        <div>
          <Label>Фотографии</Label>
          <div className="mt-2 space-y-3">
            {/* Upload Button */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full rounded-xl gap-2"
              >
                <Upload className="w-4 h-4" />
                {uploading ? 'Загрузка...' : 'Загрузить фото'}
              </Button>
            </div>

            {/* Photo Grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative group aspect-square">
                    <img
                      src={`${process.env.NEXT_PUBLIC_API_URL}/media/${photo.path}`}
                      alt=""
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => console.error('Failed to load photo:', photo.path)}
                    />
                    <button
                      onClick={() => handleDeletePhoto(photo.id)}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 rounded-xl"
          >
            Отмена
          </Button>
          {dayData && (
            <Button
              onClick={handleDelete}
              disabled={deleting || saving}
              variant="destructive"
              className="flex-1 rounded-xl gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Удаление...' : 'Удалить'}
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={saving || deleting}
            className="flex-1 rounded-xl"
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StoryViewer({ 
  date, 
  dayData, 
  onClose 
}: { 
  date: Date; 
  dayData?: CalendarDay; 
  onClose: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  
  // Refs для правильной работы паузы (как в Instagram)
  const elapsedBeforePauseRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const isPausedRef = useRef(false);
  const frameIdRef = useRef<number | null>(null);
  
  useEffect(() => {
    // Mark as viewed
    markStoryAsViewed(dateStr);
  }, [dateStr]);

  // Синхронизируем ref с state для паузы
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Проверяем наличие фото
  if (!dayData?.photos || dayData.photos.length === 0) {
    return null;
  }

  const photos = dayData.photos;

  // Определяем handleNext до использования в useEffect
  const handleNext = useCallback(() => {
    setCurrentIndex((prevIndex) => {
      if (prevIndex < photos.length - 1) {
        return prevIndex + 1;
      } else {
        onClose();
        return prevIndex;
      }
    });
  }, [photos.length, onClose]);

  // Сброс прогресса при смене фото
  useEffect(() => {
    if (!dayData?.photos?.length) return;
    
    // Новая сторис - всё с нуля
    elapsedBeforePauseRef.current = 0;
    setProgress(0);
    startTimeRef.current = null;
  }, [currentIndex, dayData?.photos?.length]);

  // Основная логика анимации с правильной паузой
  useEffect(() => {
    if (!dayData?.photos?.length || isPaused) return;

    const duration = 7000;
    let frameId: number;
    
    // Если это возобновление после паузы, продолжаем с того же места
    // Если новая сторис, startTimeRef будет null и начнём с нуля
    if (startTimeRef.current === null) {
      startTimeRef.current = performance.now();
    }

    const updateProgress = (now: number) => {
      // Проверяем паузу через ref (актуальное значение)
      if (isPausedRef.current) {
        // При постановке на паузу считаем, сколько всего прошло
        if (startTimeRef.current !== null) {
          elapsedBeforePauseRef.current += now - startTimeRef.current;
          startTimeRef.current = null; // Сбрасываем таймер
        }
        return;
      }

      // Вычисляем общее прошедшее время
      const elapsed = elapsedBeforePauseRef.current + 
        (startTimeRef.current ? now - startTimeRef.current : 0);

      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);

      if (newProgress < 100) {
        frameId = requestAnimationFrame(updateProgress);
        frameIdRef.current = frameId;
      } else {
        // Завершили текущую сторис
        elapsedBeforePauseRef.current = 0;
        startTimeRef.current = null;
        handleNext();
      }
    };

    frameId = requestAnimationFrame(updateProgress);
    frameIdRef.current = frameId;

    return () => {
      // Очень важно: отменяем старый таймер
      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current);
        frameIdRef.current = null;
      }
    };
  }, [isPaused, currentIndex, dayData?.photos?.length, handleNext]);

  const currentPhoto = photos[currentIndex];

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Обработчик клика по левой/правой части экрана
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const clickX = e.clientX - container.getBoundingClientRect().left;
    const containerWidth = container.clientWidth;
    const middle = containerWidth / 2;

    if (clickX < middle) {
      // Левая часть - предыдущее фото
      handlePrev();
    } else {
      // Правая часть - следующее фото
      handleNext();
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent 
        className="h-screen sm:h-[90vh] p-0 bg-black border-none w-screen sm:w-full max-w-full sm:max-w-4xl m-0 sm:m-auto rounded-none sm:rounded-lg"
      >
        <DialogHeader className="sr-only">
          <DialogTitle>История дня</DialogTitle>
          <DialogDescription>
            Просмотр фотографий дня {date.toLocaleDateString('ru-RU')}
          </DialogDescription>
        </DialogHeader>
        <div 
          className="relative w-full h-full flex items-center justify-center cursor-pointer"
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
          onClick={handleContainerClick}
        >
          {/* Progress bars */}
          <div className="absolute top-2 left-2 right-2 flex gap-1 z-10 pointer-events-none">
            {photos.map((_, idx) => (
              <div
                key={idx}
                className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-white"
                  style={{ 
                    width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%'
                  }}
                />
              </div>
            ))}
          </div>

          {/* Photo */}
          <AnimatePresence mode="wait">
            <motion.img
              key={currentIndex}
              src={`${process.env.NEXT_PUBLIC_API_URL}/media/${currentPhoto.path}`}
              alt=""
              className="max-w-full max-h-full object-contain pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onError={(e) => {
                console.error('Failed to load image:', currentPhoto.path);
                console.error('Full URL:', `${process.env.NEXT_PUBLIC_API_URL}/media/${currentPhoto.path}`);
              }}
            />
          </AnimatePresence>

          {/* Info Overlay */}
          <div id="story-description" className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 sm:p-6 text-white z-10 pointer-events-none">
            <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
              {dayData.mood && (
                <div className="text-2xl sm:text-3xl">{dayData.mood}</div>
              )}
              <div>
                {dayData.title && (
                  <div className="font-semibold text-base sm:text-lg">{dayData.title}</div>
                )}
                <div className="text-xs sm:text-sm opacity-80">
                  {date.toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>
              </div>
            </div>
            {dayData.note && (
              <p className="text-xs sm:text-sm opacity-90 line-clamp-2 sm:line-clamp-3">{dayData.note}</p>
            )}
            <div className="text-xs opacity-70 mt-1 sm:mt-2">
              {currentIndex + 1} / {photos.length}
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors z-10 pointer-events-auto"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
