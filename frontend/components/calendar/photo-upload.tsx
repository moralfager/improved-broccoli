"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { mediaApi } from "@/lib/api";

interface PhotoUploadProps {
  date: string;
  onUploadComplete?: () => void;
}

export function PhotoUpload({ date, onUploadComplete }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<Array<{ file: File; url: string }>>([]);
  const [error, setError] = useState("");

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError("");
    const newPreviews = acceptedFiles.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setPreviews((prev) => [...prev, ...newPreviews]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif", ".webp"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const removePreview = (index: number) => {
    setPreviews((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleUpload = async () => {
    if (previews.length === 0) return;

    try {
      setUploading(true);
      setError("");

      for (let i = 0; i < previews.length; i++) {
        await mediaApi.upload(previews[i].file, date, i);
      }

      // Cleanup previews
      previews.forEach((preview) => URL.revokeObjectURL(preview.url));
      setPreviews([]);
      
      onUploadComplete?.();
    } catch (err: any) {
      setError(err.response?.data?.message || "Ошибка при загрузке фото");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        {isDragActive ? (
          <p className="text-sm text-muted-foreground">
            Отпустите файлы здесь...
          </p>
        ) : (
          <div>
            <p className="text-sm text-muted-foreground mb-1">
              Перетащите фото сюда или кликните для выбора
            </p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, GIF, WebP до 10MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="text-sm text-red-500 text-center p-2 bg-red-50 rounded">
          {error}
        </div>
      )}

      <AnimatePresence>
        {previews.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-3 gap-4">
              {previews.map((preview, index) => (
                <motion.div
                  key={preview.url}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative aspect-square rounded-lg overflow-hidden bg-muted group"
                >
                  <img
                    src={preview.url}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removePreview(index)}
                    className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>

            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Загрузка...
                </>
              ) : (
                `Загрузить ${previews.length} фото`
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

