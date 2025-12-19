"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Edit2, Trash2, Save, User, Lock, Mail } from "lucide-react";
import { periodsApi, usersApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";

interface Period {
  id: number;
  name: string;
  startDate: string;
  endDate?: string;
  color: string;
  order: number;
}

const PERIOD_COLORS = [
  { value: '#e5e7eb', label: 'Серый (не знакомы)' },
  { value: '#93c5fd', label: 'Голубой (знакомы)' },
  { value: '#fda4af', label: 'Розовый (встречаемся)' },
  { value: '#f87171', label: 'Красный (женаты)' },
  { value: '#a78bfa', label: 'Фиолетовый' },
  { value: '#fbbf24', label: 'Жёлтый' },
  { value: '#34d399', label: 'Зелёный' },
];

export default function SettingsPage() {
  const { clearAuth, user } = useAuthStore();
  const router = useRouter();
  const [periods, setPeriods] = useState<Period[]>([]);
  const [showPeriodDialog, setShowPeriodDialog] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<Period | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [periodForm, setPeriodForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    color: '#e5e7eb',
    order: 0,
  });

  // Profile forms
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    telegram: '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [periodsData, userData] = await Promise.all([
        periodsApi.getAll(),
        usersApi.getMe(),
      ]);
      setPeriods(periodsData.sort((a: Period, b: Period) => a.order - b.order));
      setProfileForm({
        name: userData.name || '',
        email: userData.email || '',
        telegram: userData.telegram || '',
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Period handlers
  const openPeriodDialog = (period?: Period) => {
    if (period) {
      setEditingPeriod(period);
      setPeriodForm({
        name: period.name,
        startDate: new Date(period.startDate).toISOString().split('T')[0],
        endDate: period.endDate ? new Date(period.endDate).toISOString().split('T')[0] : '',
        color: period.color,
        order: period.order,
      });
    } else {
      setEditingPeriod(null);
      setPeriodForm({
        name: '',
        startDate: '',
        endDate: '',
        color: '#e5e7eb',
        order: periods.length,
      });
    }
    setShowPeriodDialog(true);
  };

  const handlePeriodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const data = {
        ...periodForm,
        startDate: new Date(periodForm.startDate).toISOString(),
        endDate: periodForm.endDate ? new Date(periodForm.endDate).toISOString() : undefined,
      };

      if (editingPeriod) {
        await periodsApi.update(editingPeriod.id, data);
      } else {
        await periodsApi.create(data);
      }

      await loadData();
      closePeriodDialog();
    } catch (error) {
      console.error('Failed to save period:', error);
    }
  };

  const deletePeriod = async (id: number) => {
    if (!confirm('Удалить этот период?')) return;
    
    try {
      await periodsApi.delete(id);
      await loadData();
    } catch (error) {
      console.error('Failed to delete period:', error);
    }
  };

  const closePeriodDialog = () => {
    setShowPeriodDialog(false);
    setEditingPeriod(null);
  };

  // Profile handlers
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      await usersApi.updateName(profileForm.name);
      await usersApi.updateEmail(profileForm.email);
      if (profileForm.telegram) {
        await usersApi.updateTelegram(profileForm.telegram);
      }
      alert('Профиль обновлён');
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      alert(error.response?.data?.message || 'Ошибка обновления профиля');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Новые пароли не совпадают');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      alert('Пароль должен быть не менее 6 символов');
      return;
    }
    
    try {
      setSaving(true);
      await usersApi.updatePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      alert('Пароль обновлён');
    } catch (error: any) {
      console.error('Failed to update password:', error);
      alert(error.response?.data?.message || 'Ошибка обновления пароля');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    clearAuth();
    router.push('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Настройки</h1>
          <p className="text-muted-foreground">Управление профилем и периодами отношений</p>
        </div>

        {/* Profile Settings */}
        <Card className="p-6 glass-effect">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">Профиль</h2>
          </div>

          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                placeholder="Ваше имя"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                placeholder="email@example.com"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="telegram">Telegram</Label>
              <Input
                id="telegram"
                value={profileForm.telegram}
                onChange={(e) => setProfileForm({ ...profileForm, telegram: e.target.value })}
                placeholder="@username"
                className="mt-1"
              />
            </div>

            <Button type="submit" disabled={saving} className="rounded-xl">
              {saving ? 'Сохранение...' : 'Сохранить изменения'}
            </Button>
          </form>
        </Card>

        {/* Password Change */}
        <Card className="p-6 glass-effect">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">Изменить пароль</h2>
          </div>

          <form onSubmit={handlePasswordUpdate} className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Текущий пароль</Label>
              <Input
                id="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                placeholder="••••••••"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="newPassword">Новый пароль</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                placeholder="••••••••"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Подтвердите новый пароль</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                placeholder="••••••••"
                className="mt-1"
              />
            </div>

            <Button type="submit" disabled={saving} className="rounded-xl">
              {saving ? 'Обновление...' : 'Обновить пароль'}
            </Button>
          </form>
        </Card>

        {/* Relationship Periods */}
        <Card className="p-6 glass-effect">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Периоды отношений</h2>
            <Button onClick={() => openPeriodDialog()} className="rounded-xl gap-2">
              <Plus className="w-4 h-4" />
              Добавить период
            </Button>
          </div>

          <div className="space-y-3">
            {periods.map((period, index) => (
              <motion.div
                key={period.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 rounded-xl hover:scale-[1.02] transition-all"
                style={{ backgroundColor: period.color }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{period.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(period.startDate).toLocaleDateString('ru-RU')}
                      {period.endDate && ` - ${new Date(period.endDate).toLocaleDateString('ru-RU')}`}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openPeriodDialog(period)}
                      className="rounded-xl"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deletePeriod(period.id)}
                      className="rounded-xl hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>

        {/* Logout */}
        <Card className="p-6 glass-effect">
          <Button
            variant="destructive"
            onClick={handleLogout}
            className="w-full rounded-xl"
          >
            Выйти из аккаунта
          </Button>
        </Card>

        {/* Period Dialog */}
        <Dialog open={showPeriodDialog} onOpenChange={setShowPeriodDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingPeriod ? 'Редактировать период' : 'Добавить период'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handlePeriodSubmit} className="space-y-4">
              <div>
                <Label htmlFor="periodName">Название</Label>
                <Input
                  id="periodName"
                  value={periodForm.name}
                  onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })}
                  placeholder="Например: Знакомы"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="periodColor">Цвет</Label>
                <select
                  id="periodColor"
                  value={periodForm.color}
                  onChange={(e) => setPeriodForm({ ...periodForm, color: e.target.value })}
                  className="w-full mt-1 p-2 border rounded-lg"
                  required
                >
                  {PERIOD_COLORS.map((color) => (
                    <option key={color.value} value={color.value}>
                      {color.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="startDate">Дата начала</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={periodForm.startDate}
                  onChange={(e) => setPeriodForm({ ...periodForm, startDate: e.target.value })}
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="endDate">Дата окончания (необязательно)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={periodForm.endDate}
                  onChange={(e) => setPeriodForm({ ...periodForm, endDate: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closePeriodDialog}
                  className="rounded-xl"
                >
                  Отмена
                </Button>
                <Button type="submit" className="rounded-xl">
                  {editingPeriod ? 'Сохранить' : 'Создать'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
