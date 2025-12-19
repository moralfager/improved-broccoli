"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileJson, FileSpreadsheet } from "lucide-react";
import { api } from "@/lib/api";

export default function StatsPage() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (format: 'json' | 'csv') => {
    try {
      setDownloading(format);
      
      const response = await api.get(`/stats/export/${format}`, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], {
        type: format === 'json' ? 'application/json' : 'text/csv',
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timeline-export.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error('Failed to download:', error);
      if (error.response?.status === 401) {
        alert('Сессия истекла. Пожалуйста, войдите снова.');
        window.location.href = '/login';
      } else {
        alert('Ошибка при скачивании файла');
      }
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-3 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        <Card className="p-4 sm:p-6">
          <CardHeader>
            <CardTitle className="text-2xl sm:text-3xl">Экспорт данных</CardTitle>
            <CardDescription>
              Скачайте всю историю timeline и ссылки на фотографии
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button
                onClick={() => handleDownload('json')}
                disabled={downloading !== null}
                className="w-full h-auto p-4 flex flex-col items-center gap-2"
                variant="outline"
              >
                <FileJson className="w-8 h-8" />
                <div className="text-center">
                  <div className="font-semibold">JSON</div>
                  <div className="text-xs text-muted-foreground">
                    {downloading === 'json' ? 'Скачивание...' : 'Структурированные данные'}
                  </div>
                </div>
              </Button>

              <Button
                onClick={() => handleDownload('csv')}
                disabled={downloading !== null}
                className="w-full h-auto p-4 flex flex-col items-center gap-2"
                variant="outline"
              >
                <FileSpreadsheet className="w-8 h-8" />
                <div className="text-center">
                  <div className="font-semibold">CSV</div>
                  <div className="text-xs text-muted-foreground">
                    {downloading === 'csv' ? 'Скачивание...' : 'Таблица для Excel'}
                  </div>
                </div>
              </Button>
            </div>

            <div className="text-sm text-muted-foreground space-y-2 pt-4 border-t">
              <p><strong>JSON формат</strong> содержит полную структуру данных с вложенными объектами фотографий.</p>
              <p><strong>CSV формат</strong> удобен для открытия в Excel или Google Sheets. Ссылки на фото разделены точкой с запятой.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

