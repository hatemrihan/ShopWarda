'use client';

/**
 * The v1.1 release section — an animated bouquet that builds itself,
 * then the story of what changed, written for Aya rather than for engineers.
 */

import { motion, useReducedMotion } from 'motion/react';
import { Flower2, Gift, Palette, Mail, ReceiptText } from 'lucide-react';

// ── The bouquet that builds itself ────────────────────────────

const STEMS = [
  { d: 'M100 175 C 92 130, 74 110, 60 92', head: { cx: 58, cy: 88 }, hex: '#E8A0A8', r: 11 },
  { d: 'M100 175 C 98 128, 92 104, 84 74', head: { cx: 83, cy: 70 }, hex: '#D0D48D', r: 9 },
  { d: 'M100 175 C 100 124, 102 96, 104 62', head: { cx: 105, cy: 58 }, hex: '#F2C5AE', r: 12 },
  { d: 'M100 175 C 104 128, 112 106, 122 78', head: { cx: 124, cy: 74 }, hex: '#C98B9B', r: 9 },
  { d: 'M100 175 C 110 132, 128 112, 142 94', head: { cx: 144, cy: 90 }, hex: '#E8D7C3', r: 10 },
];

function AnimatedBouquet() {
  const reduce = useReducedMotion();

  return (
    <svg
      viewBox="0 0 200 200"
      className="w-full max-w-[240px] h-auto"
      role="img"
      aria-label="An illustration of a bouquet assembling itself, stem by stem"
    >
      {/* Stems draw upward, one after another */}
      {STEMS.map((stem, i) => (
        <motion.path
          key={`stem-${i}`}
          d={stem.d}
          stroke="#6F7D52"
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
          initial={reduce ? { pathLength: 1 } : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, delay: 0.2 + i * 0.16, ease: 'easeOut' }}
        />
      ))}

      {/* Each bloom opens once its stem arrives */}
      {STEMS.map((stem, i) => (
        <motion.g key={`bloom-${i}`}>
          <motion.circle
            cx={stem.head.cx}
            cy={stem.head.cy}
            r={stem.r}
            fill={stem.hex}
            initial={reduce ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              duration: 0.5,
              delay: 0.75 + i * 0.16,
              type: 'spring',
              stiffness: 220,
              damping: 14,
            }}
            style={{ transformOrigin: `${stem.head.cx}px ${stem.head.cy}px` }}
          />
          <motion.circle
            cx={stem.head.cx}
            cy={stem.head.cy}
            r={stem.r * 0.38}
            fill="#FFFDF7"
            initial={reduce ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 0.85 }}
            transition={{ duration: 0.4, delay: 0.95 + i * 0.16 }}
          />
        </motion.g>
      ))}

      {/* The wrap closes around them last */}
      <motion.path
        d="M68 172 L100 196 L132 172 L118 150 L82 150 Z"
        fill="#D0D48D"
        initial={reduce ? { scale: 1, opacity: 1 } : { scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.55, delay: 1.7, type: 'spring', stiffness: 180, damping: 16 }}
        style={{ transformOrigin: '100px 175px' }}
      />
      <motion.path
        d="M82 150 L100 196 L118 150"
        stroke="#B7BC72"
        strokeWidth={1.5}
        fill="none"
        initial={reduce ? { opacity: 1 } : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 2 }}
      />
    </svg>
  );
}

// ── Feature list ──────────────────────────────────────────────

const CHANGES = [
  {
    icon: Flower2,
    title: 'Customers can build their own bouquet',
    body: 'Pick the flowers one stem at a time, choose the colour, choose the wrap, add a handwritten card. The price adds up live as they build it. Nothing is priced on their phone — the server checks every number again before the order is taken, so nobody can talk you into a discount you never offered.',
    note: 'Waiting on you: add your flowers under Bouquet Builder, then switch it on.',
  },
  {
    icon: Gift,
    title: 'Wrapping paper is a real part of the shop',
    body: 'It has its own screen now. Name it, photograph it, price it, done — no options, no variants, none of that. It shows up in the shop like anything else, with its own page.',
  },
  {
    icon: Palette,
    title: 'Colours are actually colours',
    body: 'Every colour swatch on the site used to be the same dark square, whatever you called it. Now you pick the real colour, and that is the dot customers see. Small thing. Looks a hundred times better.',
  },
  {
    icon: ReceiptText,
    title: 'Orders reach you, and the customer sees proof',
    body: 'Some orders were quietly failing before they ever reached you. Fixed. And after paying, customers now land on a page showing exactly what they bought instead of being dumped back into the shop wondering if it worked.',
  },
  {
    icon: Mail,
    title: 'The emails say what they should',
    body: 'Your order email now spells out the full bouquet — every flower, every colour, the wrap. If they asked for a handwritten card, the message is in a box you cannot miss, because you are the one writing it out.',
  },
];

export function WhatsNewV11() {
  const reduce = useReducedMotion();

  const rise = (delay: number) => ({
    initial: reduce ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease: 'easeOut' as const },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div {...rise(0)} className="flex flex-col gap-2 items-start">
        <div className="flex items-center gap-2">
          <span className="relative inline-flex">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#D0D48D]/40" />
            <span className="relative rounded-full bg-[#D0D48D] px-2.5 py-0.5 text-[11px] font-bold tracking-wider text-stone-900">
              JUST LANDED
            </span>
          </span>
          <span className="text-[11px] text-white/40 font-mono">v1.1.0</span>
        </div>

        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
          The bouquet update
        </h2>
      </motion.div>

      {/* Bouquet + note */}
      <motion.div
        {...rise(0.1)}
        className="grid sm:grid-cols-[240px_1fr] gap-6 items-center rounded-xl border border-white/[0.08] bg-gradient-to-br from-white/[0.04] to-transparent p-5"
      >
        <div className="flex justify-center">
          <AnimatedBouquet />
        </div>

        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-white/85">
            Aya — you know how people keep asking whether they can choose the flowers
            themselves? They can now.
          </p>
          <p className="text-sm leading-relaxed text-white/70">
            They pick the stems, the colours, the wrapping, and write the card message
            in their own words. You get the whole thing spelled out in your email, so
            you know exactly what to tie together before it goes out the door.
          </p>
          <p className="text-sm leading-relaxed text-white/70">
            The rest of this update is quieter but honestly matters more: orders that
            used to fail silently now go through, and the shop got faster.
          </p>
        </div>
      </motion.div>

      {/* Changes */}
      <div className="space-y-3">
        {CHANGES.map((change, i) => (
          <motion.div
            key={change.title}
            {...rise(0.25 + i * 0.09)}
            whileHover={reduce ? undefined : { x: 4 }}
            className="group flex gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-[#D0D48D]/30"
          >
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#D0D48D]/10 text-[#D0D48D] transition-colors group-hover:bg-[#D0D48D]/20">
              <change.icon className="h-4 w-4" />
            </div>

            <div className="min-w-0 space-y-1.5">
              <h3 className="text-[14px] font-medium text-white">{change.title}</h3>
              <p className="text-[13px] leading-relaxed text-white/60">{change.body}</p>
              {change.note && (
                <p className="inline-flex rounded-md bg-amber-500/10 px-2 py-1 text-[11px] text-amber-300/90">
                  {change.note}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Sign-off */}
      <motion.p
        {...rise(0.25 + CHANGES.length * 0.09)}
        className="text-[13px] leading-relaxed text-white/50 italic"
      >
        Break it, poke at it, tell me what feels wrong. That is the fastest way to
        make it yours.
      </motion.p>
    </div>
  );
}
