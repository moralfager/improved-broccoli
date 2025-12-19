"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PhotoUpload } from "./photo-upload";
import { calendarApi } from "@/lib/api";
import { X, Plus } from "lucide-react";

interface DayEditorProps {
  date: string;
  onClose: () => void;
  onSave?: () => void;
}

interface DayForm {
  title: string;
  mood: string;
  note: string;
}

const MOOD_OPTIONS = ["😊", "😍", "🥰", "🤩", "😎", "🤗", "😌", "💕", "❤️", "🌟"];

export function DayEditor({ date, onClose, onSave }: DayEditorProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);

  const { register, handleSubmit, setValue, watch } = useForm<DayForm>();
  const selectedMood = watch("mood");

  const onSubmit = async (data: DayForm) => {
    try {
      setSaving(true);
      setError("");
      await calendarApi.createOrUpdateDay({ date, ...data });
      onSave?.();
      if (!showPhotoUpload) {
        onClose();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Ошибка при сохранении");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {new Date(date).toLocaleDateString("ru-RU", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Настроение
                </label>
                <div className="flex flex-wrap gap-2">
                  {MOOD_OPTIONS.map((mood) => (
                    <button
                      key={mood}
                      type="button"
                      onClick={() => setValue("mood", mood)}
                      className={`text-2xl p-2 rounded-lg border-2 transition-all ${
                        selectedMood === mood
                          ? "border-primary bg-primary/10 scale-110"
                          : "border-transparent hover:border-border"
                      }`}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Заголовок
                </label>
                <Input
                  {...register("title")}
                  placeholder="Особенный день..."
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Заметка
                </label>
                <Textarea
                  {...register("note")}
                  placeholder="Что произошло сегодня..."
                  rows={5}
                />
              </div>

              {error && (
                <div className="text-sm text-red-500 text-center p-2 bg-red-50 rounded">
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={saving} className="flex-1">
                  {saving ? "Сохранение..." : "Сохранить"}
                </Button>
                {!showPhotoUpload && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPhotoUpload(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить фото
                  </Button>
                )}
              </div>
            </form>

            {showPhotoUpload && (
              <div className="pt-4 border-t">
                <h3 className="text-sm font-medium mb-4">Добавить фотографии</h3>
                <PhotoUpload
                  date={date}
                  onUploadComplete={() => {
                    onSave?.();
                    onClose();
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

