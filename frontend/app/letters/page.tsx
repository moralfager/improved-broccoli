"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Mail, MailOpen } from "lucide-react";
import { lettersApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth.store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface Letter {
  id: number;
  authorId: number;
  text: string;
  isRead: boolean;
  createdAt: string;
  author: {
    id: number;
    name: string;
  };
}

export default function LettersPage() {
  const { user } = useAuthStore();
  const [letters, setLetters] = useState<Letter[]>([]);
  const [showComposer, setShowComposer] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [loading, setLoading] = useState(true);
  const [newLetterText, setNewLetterText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadLetters();
    
    // Poll for new letters every 30 seconds
    const interval = setInterval(loadLetters, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadLetters = async () => {
    try {
      const data = await lettersApi.getAll();
      // Sort by creation date, newest first
      setLetters(data.sort((a: Letter, b: Letter) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
      setLoading(false);
    } catch (error) {
      console.error('Failed to load letters:', error);
      setLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newLetterText.trim()) return;
    
    try {
      setSending(true);
      await lettersApi.create({ text: newLetterText });
      setNewLetterText("");
      setShowComposer(false);
      await loadLetters();
    } catch (error) {
      console.error('Failed to send letter:', error);
      alert('Ошибка отправки письма');
    } finally {
      setSending(false);
    }
  };

  const handleLetterClick = async (letter: Letter) => {
    setSelectedLetter(letter);
    
    // Mark as read if it's not from current user and not already read
    if (!letter.isRead && letter.authorId !== user?.id) {
      try {
        await lettersApi.markAsRead(letter.id);
        await loadLetters();
      } catch (error) {
        console.error('Failed to mark letter as read:', error);
      }
    }
  };

  const unreadCount = letters.filter(l => l.authorId !== user?.id && !l.isRead).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with Write Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Письма</h1>
            <p className="text-muted-foreground">
              Короткие послания друг другу
              {unreadCount > 0 && (
                <span className="ml-2 px-2 py-1 bg-primary text-primary-foreground rounded-full text-xs font-medium">
                  {unreadCount} новых
                </span>
              )}
            </p>
          </div>
          <Button onClick={() => setShowComposer(true)} className="rounded-xl gap-2">
            <Plus className="w-4 h-4" />
            Написать письмо
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
        {!loading && letters.length === 0 && (
          <Card className="p-12 text-center glass-effect">
            <div className="text-6xl mb-4">💌</div>
            <h3 className="text-xl font-semibold mb-2">Нет писем</h3>
            <p className="text-muted-foreground mb-4">
              Напишите первое письмо друг другу
            </p>
            <Button onClick={() => setShowComposer(true)} className="rounded-xl gap-2">
              <Plus className="w-4 h-4" />
              Написать первое письмо
            </Button>
          </Card>
        )}

        {/* All Letters in Chronological Order */}
        {!loading && letters.length > 0 && (
          <div className="space-y-4">
            {letters.map((letter, index) => {
              const isSent = letter.authorId === user?.id;
              
              return (
                <motion.div
                  key={letter.id}
                  initial={{ opacity: 0, x: isSent ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleLetterClick(letter)}
                >
                  <Card className={`p-6 cursor-pointer hover-glow relative overflow-hidden ${
                    isSent 
                      ? 'bg-gradient-to-r from-purple-50 to-pink-50 ml-12' 
                      : !letter.isRead 
                        ? 'border-2 border-primary mr-12' 
                        : 'mr-12'
                  }`}>
                    {!isSent && !letter.isRead && (
                      <div className="absolute top-4 right-4 w-3 h-3 bg-primary rounded-full animate-pulse" />
                    )}
                    
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold ${
                        isSent 
                          ? 'bg-gradient-to-br from-cyan-400 to-blue-500' 
                          : 'bg-gradient-to-br from-pink-400 to-purple-500'
                      }`}>
                        {isSent ? 'Я' : (letter.author.name?.[0] || 'L').toUpperCase()}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="font-semibold">
                            {isSent ? 'Вы' : letter.author.name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(letter.createdAt), { addSuffix: true, locale: ru })}
                          </div>
                        </div>
                        
                        <p className={`${isSent || letter.isRead ? 'text-muted-foreground' : 'font-medium'} line-clamp-2`}>
                          {letter.text}
                        </p>
                      </div>
                      
                      {isSent ? (
                        <MailOpen className="w-5 h-5 text-muted-foreground" />
                      ) : letter.isRead ? (
                        <MailOpen className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <Mail className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Composer Dialog */}
        <Dialog open={showComposer} onOpenChange={(open) => !open && setShowComposer(false)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Новое письмо</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSend} className="space-y-4">
              <Textarea
                value={newLetterText}
                onChange={(e) => setNewLetterText(e.target.value)}
                placeholder="Напишите что-нибудь милое..."
                className="rounded-xl min-h-[200px]"
                maxLength={1000}
                autoFocus
              />
              
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {newLetterText.length} / 1000
                </div>
                <div className="flex gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowComposer(false)}
                    className="rounded-xl"
                  >
                    Отмена
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={!newLetterText.trim() || sending}
                    className="rounded-xl"
                  >
                    {sending ? 'Отправка...' : 'Отправить'}
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Letter Viewer Dialog */}
        <Dialog open={selectedLetter !== null} onOpenChange={(open) => !open && setSelectedLetter(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedLetter?.authorId === user?.id ? 'Ваше письмо' : `Письмо от ${selectedLetter?.author.name}`}
              </DialogTitle>
            </DialogHeader>
            
            {selectedLetter && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  {new Date(selectedLetter.createdAt).toLocaleString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
                
                <div className="text-lg leading-relaxed whitespace-pre-wrap">
                  {selectedLetter.text}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
