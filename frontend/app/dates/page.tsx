"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Edit2, Trash2, Heart, Calendar, Sparkles } from "lucide-react";
import { importantDatesApi } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ImportantDate {
  id: number;
  date: string;
  title: string;
  description?: string;
  category: string;
  isAnnual: boolean;
}

const CATEGORIES = [
  { value: 'знакомство', label: 'Знакомство', icon: '👋', color: 'from-blue-400 to-blue-600' },
  { value: 'первая прогулка', label: 'Первая прогулка', icon: '🚶', color: 'from-green-400 to-green-600' },
  { value: 'её события', label: 'Её события', icon: '💝', color: 'from-pink-400 to-pink-600' },
  { value: 'твои события', label: 'Твои события', icon: '💙', color: 'from-cyan-400 to-cyan-600' },
  { value: 'годовщина', label: 'Годовщина', icon: '💕', color: 'from-red-400 to-red-600' },
  { value: 'другое', label: 'Другое', icon: '⭐', color: 'from-purple-400 to-purple-600' },
];

export default function ImportantDatesPage() {
  const [dates, setDates] = useState<ImportantDate[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingDate, setEditingDate] = useState<ImportantDate | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    title: '',
    description: '',
    category: 'другое',
    isAnnual: false,
  });

  useEffect(() => {
    loadDates();
  }, []);

  const loadDates = async () => {
    try {
      setLoading(true);
      const data = await importantDatesApi.getAll();
      setDates(data.sort((a: ImportantDate, b: ImportantDate) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      ));
    } catch (error) {
      console.error('Failed to load important dates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const dateData = {
        ...formData,
        date: new Date(formData.date).toISOString(),
      };

      if (editingDate) {
        await importantDatesApi.update(editingDate.id, dateData);
      } else {
        await importantDatesApi.create(dateData);
      }

      await loadDates();
      closeDialog();
    } catch (error) {
      console.error('Failed to save important date:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить эту дату?')) return;
    
    try {
      await importantDatesApi.delete(id);
      await loadDates();
    } catch (error) {
      console.error('Failed to delete important date:', error);
    }
  };

  const openCreateDialog = () => {
    setEditingDate(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      title: '',
      description: '',
      category: 'другое',
      isAnnual: false,
    });
    setShowDialog(true);
  };

  const openEditDialog = (date: ImportantDate) => {
    setEditingDate(date);
    setFormData({
      date: new Date(date.date).toISOString().split('T')[0],
      title: date.title,
      description: date.description || '',
      category: date.category,
      isAnnual: date.isAnnual,
    });
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingDate(null);
  };

  const getDaysUntil = (dateStr: string) => {
    const now = new Date();
    const targetDate = new Date(dateStr);
    const currentYear = now.getFullYear();
    
    // For annual dates, check this year's occurrence
    targetDate.setFullYear(currentYear);
    
    // If the date already passed this year, check next year
    if (targetDate < now) {
      targetDate.setFullYear(currentYear + 1);
    }
    
    const diffTime = targetDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const formatCountdown = (days: number) => {
    if (days === 0) return 'Сегодня! 🎉';
    if (days === 1) return 'Завтра! ⭐';
    if (days < 0) return `Прошло ${Math.abs(days)} дней назад`;
    if (days < 7) return `Через ${days} ${getDaysWord(days)}`;
    if (days < 30) return `Через ${Math.floor(days / 7)} ${getWeeksWord(Math.floor(days / 7))}`;
    if (days < 365) return `Через ${Math.floor(days / 30)} ${getMonthsWord(Math.floor(days / 30))}`;
    return `Через ${Math.floor(days / 365)} ${getYearsWord(Math.floor(days / 365))}`;
  };

  const getDaysWord = (days: number) => {
    if (days === 1) return 'день';
    if (days >= 2 && days <= 4) return 'дня';
    return 'дней';
  };

  const getWeeksWord = (weeks: number) => {
    if (weeks === 1) return 'неделю';
    if (weeks >= 2 && weeks <= 4) return 'недели';
    return 'недель';
  };

  const getMonthsWord = (months: number) => {
    if (months === 1) return 'месяц';
    if (months >= 2 && months <= 4) return 'месяца';
    return 'месяцев';
  };

  const getYearsWord = (years: number) => {
    if (years === 1) return 'год';
    if (years >= 2 && years <= 4) return 'года';
    return 'лет';
  };

  const getCategoryData = (category: string) => {
    return CATEGORIES.find(c => c.value === category) || CATEGORIES[5];
  };

  // Group by category
  const groupedDates = dates.reduce((acc, date) => {
    if (!acc[date.category]) {
      acc[date.category] = [];
    }
    acc[date.category].push(date);
    return acc;
  }, {} as Record<string, ImportantDate[]>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Важные даты</h1>
            <p className="text-muted-foreground">Особенные моменты вашей истории</p>
          </div>
          <Button onClick={openCreateDialog} className="rounded-xl">
            <Plus className="w-4 h-4 mr-2" />
            Добавить дату
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Загрузка...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && dates.length === 0 && (
          <Card className="p-12 text-center">
            <div className="text-6xl mb-4">💝</div>
            <h3 className="text-xl font-semibold mb-2">Нет важных дат</h3>
            <p className="text-muted-foreground mb-4">
              Добавьте важные события и годовщины
            </p>
            <Button onClick={openCreateDialog} className="rounded-xl">
              <Plus className="w-4 h-4 mr-2" />
              Добавить первую дату
            </Button>
          </Card>
        )}

        {/* Dates List */}
        {!loading && Object.entries(groupedDates).map(([category, categoryDates]) => {
          const categoryData = getCategoryData(category);
          
          return (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="text-2xl">{categoryData.icon}</div>
                <h2 className="text-xl font-semibold">{categoryData.label}</h2>
              </div>
              
              {categoryDates.map((date, index) => {
                const daysUntil = getDaysUntil(date.date);
                const isPast = !date.isAnnual && new Date(date.date) < new Date();
                
                return (
                  <motion.div
                    key={date.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className={`p-6 overflow-hidden relative ${isPast ? 'opacity-70' : ''}`}>
                      {/* Background Gradient */}
                      <div 
                        className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${categoryData.color} opacity-10 rounded-bl-full`}
                      />
                      
                      <div className="relative flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl font-semibold">{date.title}</h3>
                            {date.isAnnual && (
                              <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                                Ежегодно
                              </span>
                            )}
                          </div>
                          
                          <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {new Date(date.date).toLocaleDateString('ru-RU', {
                              day: 'numeric',
                              month: 'long',
                              year: date.isAnnual ? undefined : 'numeric'
                            })}
                          </div>
                          
                          {date.description && (
                            <p className="text-muted-foreground mb-3">{date.description}</p>
                          )}
                          
                          {/* Countdown */}
                          {!isPast && (
                            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium bg-gradient-to-r ${categoryData.color} text-white`}>
                              <Sparkles className="w-4 h-4" />
                              {formatCountdown(daysUntil)}
                            </div>
                          )}
                        </div>
                        
                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(date)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(date.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          );
        })}

        {/* Create/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingDate ? 'Редактировать дату' : 'Новая важная дата'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Название *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Например: День нашего знакомства"
                  required
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Дата *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Категория</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Описание</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Особенная история этого дня..."
                  className="rounded-xl"
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isAnnual"
                  checked={formData.isAnnual}
                  onChange={(e) => setFormData({ ...formData, isAnnual: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="isAnnual">Ежегодное событие (день рождения, годовщина)</Label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1 rounded-xl">
                  {editingDate ? 'Сохранить' : 'Создать'}
                </Button>
                <Button type="button" variant="outline" onClick={closeDialog} className="rounded-xl">
                  Отмена
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

