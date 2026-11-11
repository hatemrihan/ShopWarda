'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

interface PaymentMethodSelectorProps {
  value: 'cod' | 'instapay' | '';
  onChange: (method: 'cod' | 'instapay') => void;
  codEnabled: boolean;
  instaPayEnabled: boolean;
  codFee: number; // piasters
  instaPayConfig?: {
    accountLink: string;
    instructions: string;
  };
  /** Called with the uploaded proof's key, or '' when the upload is cleared/failed. */
  onScreenshotUpload?: (assetKey: string) => void;
  /** Lets the checkout block "place order" while a proof is still uploading. */
  onUploadingChange?: (uploading: boolean) => void;
}

const ACCEPTED_PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PROOF_BYTES = 10 * 1024 * 1024;

export function PaymentMethodSelector({
  value,
  onChange,
  codEnabled,
  instaPayEnabled,
  codFee,
  instaPayConfig,
  onScreenshotUpload,
  onUploadingChange,
}: PaymentMethodSelectorProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [screenShotPreview, setScreenShotPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so choosing the same file again (after a failure) still
    // fires a change event.
    e.target.value = '';
    if (!file) return;

    // Check before uploading. `accept="image/*"` let iPhones offer HEIC, which
    // was uploaded in full only to be refused by the server with a raw
    // "Unsupported file type: image/heic" in a browser alert.
    if (!ACCEPTED_PROOF_TYPES.includes(file.type)) {
      toast.error('Please upload a JPG, PNG or WEBP image (a screenshot works best).');
      return;
    }
    if (file.size > MAX_PROOF_BYTES) {
      toast.error('That image is larger than 10MB. Please choose a smaller one.');
      return;
    }

    // Show instant local preview
    const reader = new FileReader();
    reader.onloadend = () => setScreenShotPreview(reader.result as string);
    reader.readAsDataURL(file);

    // A new upload replaces any earlier proof.
    setUploadedFile(null);
    onScreenshotUpload?.('');

    try {
      setUploading(true);
      onUploadingChange?.(true);

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload/screenshot', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to upload screenshot');
      }

      setUploadedFile(file.name);
      onScreenshotUpload?.(data.assetKey);
    } catch (err) {
      console.error('Screenshot upload failed:', err);
      // Do not leave a preview on screen for a file that never reached us.
      setScreenShotPreview(null);
      toast.error(err instanceof Error ? err.message : 'Failed to upload screenshot. Please try again.');
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
    }
  };

  const codFeeEGP = (codFee / 100).toFixed(0);

  return (
    <div className="space-y-4 pt-2">
      <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-800 border-b border-neutral-300 pb-2">
        PAYMENT METHOD
      </h2>

      {/* Detailed Payment Options */}
      <div className="space-y-3">
        {/* InstaPay Option */}
        {instaPayEnabled && (
          <button
            type="button"
            onClick={() => onChange('instapay')}
            className={`w-full flex items-start gap-3.5 py-3 px-2 border-b-2 transition-all text-left cursor-pointer ${
              value === 'instapay'
                ? 'border-neutral-900 bg-transparent'
                : 'border-neutral-200 hover:border-neutral-400 bg-transparent'
            }`}
          >
            <div
              className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                value === 'instapay' ? 'border-neutral-900' : 'border-neutral-300'
              }`}
            >
              {value === 'instapay' && (
                <div className="w-2 h-2 rounded-full bg-neutral-900" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <Image
                  src="/images/instapay.png"
                  alt="InstaPay"
                  width={140}
                  height={48}
                  className="h-10 sm:h-12 w-auto object-contain"
                />
                <Badge variant="outline" className="text-[9px] font-semibold px-1.5 py-0 border-neutral-300 text-neutral-700 bg-neutral-100">
                  Instant Transfer
                </Badge>
              </div>
              <p className="text-[11px] text-neutral-500 mt-1">
                Bank transfer via InstaPay. Upload payment receipt below.
              </p>
            </div>
          </button>
        )}

        {/* InstaPay Payment Instructions Panel */}
        {value === 'instapay' && (
          <Card className="border border-neutral-300 bg-neutral-50/60 shadow-xs">
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div>
                <h3 className="font-semibold text-neutral-900 mb-2 text-sm flex items-center gap-2">
                  <Image
                    src="/images/instapay.png"
                    alt="InstaPay"
                    width={100}
                    height={36}
                    className="h-7 w-auto object-contain inline-block"
                  />
                  Payment Instructions
                </h3>
                <p className="text-xs text-neutral-600 mb-1">Click the link to send money to:</p>
                <p className="font-bold text-sm text-neutral-900 mb-2 font-mono select-all">01116283071</p>
                <p className="text-xs text-neutral-600 mb-3 leading-relaxed">
                  Kindly send a screenshot of the transaction, it will be uploaded to our system to confirm your payment.
                </p>
                {instaPayConfig?.accountLink ? (
                  <a
                    href={instaPayConfig.accountLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block bg-neutral-900 text-white px-4 py-2.5 rounded-lg hover:bg-neutral-800 transition-colors text-center w-full sm:w-auto text-xs font-semibold"
                  >
                    Pay with InstaPay
                  </a>
                ) : (
                  <a
                    href="tel:01116283071"
                    className="inline-block bg-neutral-900 text-white px-4 py-2.5 rounded-lg hover:bg-neutral-800 transition-colors text-center w-full sm:w-auto text-xs font-semibold"
                  >
                    Pay with InstaPay
                  </a>
                )}
              </div>

              <div className="pt-3 border-t border-neutral-200/80">
                <label className="block text-xs font-bold text-neutral-800 mb-2">
                  Upload Transaction Screenshot *
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleScreenshotUpload}
                  className="hidden"
                />
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    variant="outline"
                    size="sm"
                    className="text-xs font-semibold bg-white text-neutral-900 border-neutral-300 hover:bg-neutral-100 shadow-xs"
                  >
                    {uploading ? (
                      <span className="flex items-center gap-2">
                        <Spinner className="w-3.5 h-3.5" /> Uploading...
                      </span>
                    ) : uploadedFile ? (
                      <span className="text-green-700 font-medium">{uploadedFile}</span>
                    ) : (
                      'Choose File'
                    )}
                  </Button>
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Accepted formats: JPG, PNG, WEBP (max 10MB)
                </p>
              </div>

              {screenShotPreview && (
                <div className="mt-3 pt-2 border-t border-neutral-200">
                  <p className="text-xs font-semibold text-neutral-800 mb-2">Preview:</p>
                  <div className="relative w-32 h-32 sm:w-40 sm:h-40 border border-neutral-300 rounded-lg overflow-hidden bg-white shadow-xs">
                    <Image
                      src={screenShotPreview}
                      alt="Transaction screenshot preview"
                      fill
                      sizes="160px"
                      className="object-contain p-1"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* COD Option */}
        {codEnabled && (
          <button
            type="button"
            onClick={() => onChange('cod')}
            className={`w-full flex items-start gap-3.5 py-3 px-2 border-b-2 transition-all text-left cursor-pointer ${
              value === 'cod'
                ? 'border-neutral-900 bg-transparent'
                : 'border-neutral-200 hover:border-neutral-400 bg-transparent'
            }`}
          >
            <div
              className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                value === 'cod' ? 'border-neutral-900' : 'border-neutral-300'
              }`}
            >
              {value === 'cod' && (
                <div className="w-2 h-2 rounded-full bg-neutral-900" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <Image
                  src="/images/cod.png"
                  alt="Cash on Delivery"
                  width={100}
                  height={48}
                  className="h-10 sm:h-12 w-auto object-contain"
                />
                <Badge variant="outline" className="text-[9px] font-semibold px-1.5 py-0 border-neutral-300 text-neutral-700 bg-neutral-100">
                  Cash on Delivery
                </Badge>
              </div>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Pay in cash upon receiving your order.
                {codFee > 0 && (
                  <span className="text-neutral-900 font-semibold"> (+EGP {codFeeEGP} COD fee)</span>
                )}
              </p>
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
