"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Check, X, Edit2, Trash2, Calendar, Clock, MapPin, Repeat } from "lucide-react";
import { plansApi } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Plan {
  id: number;
  date: string;
  time?: string;
  title: string;
  description?: string;
  type: string;
  location?: string;
  isCompleted: boolean;
  repeat?: string;
  reminder: boolean;
}

const PLAN_TYPES = [
  { value: 'прогулка', label: 'Прогулка', icon: '🚶' },
  { value: 'кафе', label: 'Кафе', icon: '☕' },
  { value: 'кино', label: 'Кино', icon: '🎬' },
  { value: 'дом', label: 'Дома', icon: '🏠' },
  { value: 'подарок', label: 'Подарок', icon: '🎁' },
  { value: 'праздник', label: 'Праздник', icon: '🎉' },
  { value: 'поездка', label: 'Поездка', icon: '✈️' },
];

const REPEAT_OPTIONS = [
  { value: 'none', label: 'Не повторяется' },
  { value: 'weekly', label: 'Каждую неделю' },
  { value: 'monthly', label: 'Каждый месяц' },
];

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '',
    title: '',
    description: '',
    type: 'прогулка',
    location: '',
    repeat: 'none',
    reminder: false,
  });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const data = await plansApi.getUpcoming(100);
      setPlans(data);
    } catch (error) {
      console.error('Failed to load plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const planData = {
        ...formData,
        date: new Date(formData.date).toISOString(),
        repeat: formData.repeat === 'none' ? undefined : formData.repeat,
      };

      if (editingPlan) {
        await plansApi.update(editingPlan.id, planData);
      } else {
        await plansApi.create(planData);
      }

      await loadPlans();
      closeDialog();
    } catch (error) {
      console.error('Failed to save plan:', error);
    }
  };

  const handleComplete = async (plan: Plan) => {
    try {
      await plansApi.complete(plan.id);
      await loadPlans();
    } catch (error) {
      console.error('Failed to complete plan:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить этот план?')) return;
    
    try {
      await plansApi.delete(id);
      await loadPlans();
    } catch (error) {
      console.error('Failed to delete plan:', error);
    }
  };

  const openCreateDialog = () => {
    setEditingPlan(null);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      time: '',
      title: '',
      description: '',
      type: 'прогулка',
      location: '',
      repeat: 'none',
      reminder: false,
    });
    setShowDialog(true);
  };

  const openEditDialog = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      date: new Date(plan.date).toISOString().split('T')[0],
      time: plan.time || '',
      title: plan.title,
      description: plan.description || '',
      type: plan.type,
      location: plan.location || '',
      repeat: plan.repeat || 'none',
      reminder: plan.reminder,
    });
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingPlan(null);
  };

  // Group plans by date
  const groupedPlans = plans.reduce((acc, plan) => {
    const dateKey = new Date(plan.date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(plan);
    return acc;
  }, {} as Record<string, Plan[]>);

  const getTypeIcon = (type: string) => {
    return PLAN_TYPES.find(t => t.value === type)?.icon || '📌';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-3 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <h1 className="text-2xl sm:text-3xl font-bold">Планы и напоминания</h1>
          <Button onClick={openCreateDialog} className="rounded-xl w-full sm:w-auto text-sm sm:text-base">
            <Plus className="w-4 h-4 mr-2" />
            Добавить план
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
        {!loading && plans.length === 0 && (
          <Card className="p-12 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-semibold mb-2">Нет планов</h3>
            <p className="text-muted-foreground mb-4">
              Начните планировать ваши совместные моменты
            </p>
            <Button onClick={openCreateDialog} className="rounded-xl">
              <Plus className="w-4 h-4 mr-2" />
              Создать первый план
            </Button>
          </Card>
        )}

        {/* Plans List */}
        {!loading && Object.entries(groupedPlans).map(([date, datePlans], groupIndex) => (
          <div key={date} className="space-y-3">
            <div className="sticky top-0 z-10 bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 py-2">
              <h2 className="text-lg font-semibold text-muted-foreground">{date}</h2>
            </div>
            
            {datePlans.map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={`p-3 sm:p-4 ${plan.isCompleted ? 'opacity-50' : ''}`}>
                  <div className="flex items-start gap-2 sm:gap-4">
                    {/* Type Icon */}
                    <div className="text-2xl sm:text-3xl flex-shrink-0">{getTypeIcon(plan.type)}</div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-semibold text-base sm:text-lg mb-1 ${plan.isCompleted ? 'line-through' : ''}`}>
                        {plan.title}
                      </h3>
                      
                      {plan.description && (
                        <p className="text-muted-foreground text-sm mb-2">{plan.description}</p>
                      )}
                      
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        {plan.time && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {plan.time}
                          </div>
                        )}
                        {plan.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {plan.location}
                          </div>
                        )}
                        {plan.repeat && plan.repeat !== 'none' && (
                          <div className="flex items-center gap-1">
                            <Repeat className="w-4 h-4" />
                            {REPEAT_OPTIONS.find(o => o.value === plan.repeat)?.label}
                          </div>
                        )}
                        {plan.reminder && (
                          <div className="text-primary">🔔 Напоминание</div>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                      {!plan.isCompleted && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleComplete(plan)}
                          className="text-green-600 hover:text-green-700 hover:bg-green-50 w-8 h-8 sm:w-10 sm:h-10"
                        >
                          <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(plan)}
                        className="w-8 h-8 sm:w-10 sm:h-10"
                      >
                        <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(plan.id)}
                        className="text-destructive hover:text-destructive w-8 h-8 sm:w-10 sm:h-10"
                      >
                        <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        ))}

        {/* Create/Edit Dialog */}
        <Dialog open={showDialog} onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base sm:text-lg">
                {editingPlan ? 'Редактировать план' : 'Новый план'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                  <Label htmlFor="time">Время</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Название *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Например: Прогулка в парке"
                  required
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Тип</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.icon} {type.label}
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
                  placeholder="Дополнительные детали..."
                  className="rounded-xl"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Место</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Например: Центральный парк"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="repeat">Повтор</Label>
                <Select value={formData.repeat} onValueChange={(value) => setFormData({ ...formData, repeat: value })}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPEAT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="reminder"
                  checked={formData.reminder}
                  onChange={(e) => setFormData({ ...formData, reminder: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="reminder">Напомнить за день до события</Label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="submit" className="flex-1 rounded-xl">
                  {editingPlan ? 'Сохранить' : 'Создать'}
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

