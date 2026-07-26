'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    message: '',
  });
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMessage('');

    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Something went wrong');

      setStatus('success');
      setFormData({ name: '', phone: '', message: '' });
    } catch (error) {
      setStatus('error');
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Something went wrong. Please try again.'
      );
    }
  };

  if (status === 'success') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <h2 className="text-2xl mb-4 font-light text-[#1a1a1a]">
            Request Submitted
          </h2>
          <p className="text-[#1a1a1a]/60 mb-8">
            Thank you. You will receive a confirmation shortly and a member of
            our Customer Care team will respond to you.
          </p>
          <button
            onClick={() => setStatus('idle')}
            className="text-sm underline underline-offset-4 text-[#1a1a1a]/60 hover:text-[#1a1a1a] transition-colors"
          >
            Submit another request
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="px-4 py-16">
      <div className="px-4 md:px-10 space-y-6 text-[#1a1a1a] max-w-4xl mx-auto">
        <h2 className="pt-4 mb-4 text-[#1a1a1a] font-bold text-center text-lg">
          Contact Form
        </h2>

        <div className="text-center mb-8 space-y-2">
          <p className="text-sm text-left max-w-2xl mx-auto">
            To submit your contact request, please complete the form below. A
            member of our Customer Care team will respond to you shortly.
          </p>
          <p className="text-sm text-left max-w-2xl mx-auto">
            You can also contact us via email at{' '}
            <a
              href="mailto:thewarda2026@gmail.com"
              className="text-blue-600 hover:text-blue-800 underline font-medium"
            >
              thewarda2026@gmail.com
            </a>
          </p>
          <p className="text-sm text-left max-w-2xl mx-auto">
            ShopWarda — Egypt, Cairo.
          </p>
        </div>

        <section>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <form
              onSubmit={handleSubmit}
              className="max-w-xl mx-auto space-y-12"
            >
              <div className="text-center text-[#1a1a1a]/80 text-sm font-light mb-6">
                Please enter your name, phone number and message:
              </div>

              <div className="space-y-8">
                {/* Name */}
                <div className="relative">
                  <input
                    type="text"
                    id="contact-name"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="peer w-full py-2 bg-transparent border-b border-[#1a1a1a]/15 text-[#1a1a1a] placeholder-transparent focus:outline-none focus:border-[#1a1a1a] transition-colors rounded-none text-xs"
                    placeholder="Name"
                  />
                  <label
                    htmlFor="contact-name"
                    className="absolute left-0 -top-3 text-[#1a1a1a]/50 text-xs transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:text-[#1a1a1a]/30 peer-placeholder-shown:top-2 peer-focus:-top-3 peer-focus:text-[#1a1a1a]/50 peer-focus:text-xs"
                  >
                    Name:
                  </label>
                </div>

                {/* Phone */}
                <div className="relative">
                  <input
                    type="tel"
                    id="contact-phone"
                    required
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="peer w-full py-2 bg-transparent border-b border-[#1a1a1a]/15 text-[#1a1a1a] placeholder-transparent focus:outline-none focus:border-[#1a1a1a] transition-colors rounded-none text-xs"
                    placeholder="Phone Number"
                  />
                  <label
                    htmlFor="contact-phone"
                    className="absolute left-0 -top-3 text-[#1a1a1a]/50 text-xs transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:text-[#1a1a1a]/30 peer-placeholder-shown:top-2 peer-focus:-top-3 peer-focus:text-[#1a1a1a]/50 peer-focus:text-xs"
                  >
                    Phone Number:
                  </label>
                </div>

                {/* Message */}
                <div className="relative">
                  <textarea
                    id="contact-message"
                    required
                    rows={4}
                    value={formData.message}
                    onChange={(e) =>
                      setFormData({ ...formData, message: e.target.value })
                    }
                    className="peer w-full py-2 bg-transparent border-b border-[#1a1a1a]/15 text-[#1a1a1a] placeholder-transparent focus:outline-none focus:border-[#1a1a1a] transition-colors rounded-none text-xs resize-none"
                    placeholder="Message"
                  />
                  <label
                    htmlFor="contact-message"
                    className="absolute left-0 -top-3 text-[#1a1a1a]/50 text-xs transition-all peer-placeholder-shown:text-xs peer-placeholder-shown:text-[#1a1a1a]/30 peer-placeholder-shown:top-2 peer-focus:-top-3 peer-focus:text-[#1a1a1a]/50 peer-focus:text-xs"
                  >
                    Message:
                  </label>
                </div>
              </div>

              {status === 'error' && (
                <p className="text-red-600 text-center text-sm">
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full bg-[#222] text-white py-4 px-8 text-xs uppercase tracking-[0.2em] hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? 'Submitting...' : 'Submit'}
              </button>
            </form>
          </motion.div>
        </section>
      </div>
    </div>
  );
}
