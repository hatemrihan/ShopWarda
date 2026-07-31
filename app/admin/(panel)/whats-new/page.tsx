'use client';

import React, { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Sparkles, Heart } from 'lucide-react';
import { WhatsNewV11 } from './whats-new-v11';

const Typewriter = ({
  text,
  delay = 300,
  speed = 50,
  className = '',
  showCursor = true,
}: {
  text: string;
  delay?: number;
  speed?: number;
  className?: string;
  showCursor?: boolean;
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const timeout = setTimeout(() => {
      setIsTyping(true);
      let i = 0;
      interval = setInterval(() => {
        setDisplayedText(text.slice(0, i + 1));
        i++;
        if (i >= text.length) {
          clearInterval(interval);
          setIsTyping(false);
        }
      }, speed);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [text, delay, speed]);

  return (
    <span className={`inline ${className}`}>
      {displayedText}
      {(isTyping || (!displayedText && showCursor)) && (
        <span className="animate-pulse ml-1 opacity-70">|</span>
      )}
    </span>
  );
};

export default function WhatsNewPage() {
  return (
    <div className="space-y-5 w-full max-w-2xl mx-auto p-4 pb-12">
      {/* ── Latest release ──────────────────────────────── */}
      <WhatsNewV11 />

      <Separator className="bg-white/10" />

      <p className="text-[11px] uppercase tracking-widest text-white/30">
        Earlier
      </p>

      {/* Header Section */}
      <div className="flex flex-col gap-2 items-start">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/10 px-2.5 py-0.5 gap-1.5 text-[11px] font-medium">
            <Sparkles className="w-3 h-3" />
            Official Release
          </Badge>
          <span className="text-[11px] text-white/40 font-mono">v1.0.0</span>
        </div>

        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
          <Typewriter
            text="ShopWarda Version 1.0.0."
            delay={200}
            speed={55}
          />
        </h1>
      </div>

      <Separator className="bg-white/10" />

      {/* Centered GIF */}
      <div className="flex justify-center items-center py-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/WhatsNew.gif"
          alt="What's New"
          className="max-w-full max-h-[35vh] w-auto object-contain"
        />
      </div>

      {/* Paragraph Card Container */}
      <Card className="bg-stone-900/60 border-white/10 backdrop-blur-md shadow-xl overflow-hidden">
        <CardHeader className="border-b border-white/5 py-2.5 px-4">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-widest text-emerald-400">
            <Heart className="w-3 h-3 text-emerald-400" />
            Developer Note
          </div>
        </CardHeader>
        <CardContent className="py-4 px-4">
          <p className="text-xs md:text-sm font-normal leading-relaxed text-white/85">
            <Typewriter
              text="Hello , aya :) , its me , your developer, this is the version 1 of your website, ask whatever you want,whatever changes you want , iam with you all the way! I just love what i do:)"
              delay={1800}
              speed={75}
            />
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
