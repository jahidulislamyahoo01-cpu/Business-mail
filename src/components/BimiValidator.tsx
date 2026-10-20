import React, { useState, useRef } from 'react';
import { Upload, CheckCircle2, AlertTriangle, XCircle, FileCode, Copy, Check, Download, Sparkles, Image, ShieldCheck, Info } from 'lucide-react';

interface BimiValidationResult {
  isSvg: boolean;
  isSquare: boolean;
  aspectRatio: string;
  hasTinyPsProfile: boolean;
  noScripts: boolean;
  noExternalResources: boolean;
  fileSizeKb: number;
  isSizeCompliant: boolean;
  dimensions: { width: number; height: number };
  rawSvg: string;
  errors: string[];
  warnings: string[];
}

interface BimiValidatorProps {
  currentLogoUrl?: string;
  onSaveLogo?: (logoUrl: string, svgContent: string) => void;
}

const SAMPLE_GIFTGHOR_SVG = `<?xml version="1.0" encoding="utf-8"?>
<svg version="1.2" baseProfile="tiny-ps" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <title>GiftGhor BIMI Official Logo</title>
  <rect width="500" height="500" rx="100" fill="#EA580C"/>
  <circle cx="250" cy="250" r="160" fill="#FFFFFF"/>
  <path d="M190 190 H310 V230 H190 Z" fill="#EA580C"/>
  <path d="M230 230 H270 V330 H230 Z" fill="#EA580C"/>
  <path d="M190 270 H310 V310 H190 Z" fill="#EA580C"/>
  <circle cx="250" cy="165" r="25" fill="#F97316"/>
</svg>`;

export const BimiValidator: React.FC<BimiValidatorProps> = ({ currentLogoUrl, onSaveLogo }) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [validation, setValidation] = useState<BimiValidationResult | null>(null);
  const [copiedRecord, setCopiedRecord] = useState(false);
  const [copiedDmarc, setCopiedDmarc] = useState(false);
  const [logoHostedUrl, setLogoHostedUrl] = useState(currentLogoUrl || 'https://giftghor.world/logo.svg');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateSvg = (content: string, name = 'uploaded-logo.svg', sizeBytes = 0) => {
    const trimmed = content.trim();
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Is valid SVG
    const isSvg = trimmed.includes('<svg') && trimmed.includes('</svg>');
    if (!isSvg) {
      errors.push('ফাইলটি ভ্যালিড SVG XML নয় (Root <svg> ট্যাগ পাওয়া যায়নি)।');
    }

    // 2. Security: No scripts or inline handlers
    const hasScripts = /<script\b/i.test(trimmed) || /on\w+\s*=/i.test(trimmed);
    const noScripts = !hasScripts;
    if (hasScripts) {
      errors.push('BIMI নিরাপত্তানীতি লঙ্ঘন: SVG এর ভেতরে <script> বা ইভেন্ট হ্যান্ডলার থাকা নিষিদ্ধ।');
    }

    // 3. No external resource links (http/https hrefs)
    const hasExternalLinks = /href\s*=\s*["']https?:\/\//i.test(trimmed) || /<image\b[^>]*href\s*=\s*["']https?:/i.test(trimmed);
    const noExternalResources = !hasExternalLinks;
    if (hasExternalLinks) {
      errors.push('BIMI নীতি লঙ্ঘন: SVG তে বাহ্যিক এক্সটার্নাল URL বা ইমেজ লিংক থাকা যাবে না (সব ভেক্টর ইন্টার্নাল হতে হবে)।');
    }

    // 4. Check Tiny-PS profile
    const hasTinyPsProfile = /baseProfile\s*=\s*["']tiny-ps["']/i.test(trimmed) || /baseProfile\s*=\s*["']tiny["']/i.test(trimmed);
    if (!hasTinyPsProfile) {
      warnings.push('BIMI স্ট্যান্ডার্ড অনুযায়ী SVG তে baseProfile="tiny-ps" এবং version="1.2" থাকা বাঞ্ছনীয়। (অটো-ফিক্স দিয়ে ঠিক করা যাবে)');
    }

    // 5. Square Aspect Ratio (1:1)
    let isSquare = false;
    let width = 0;
    let height = 0;
    let aspectRatioStr = 'Unknown';

    // Parse viewBox or width/height
    const viewBoxMatch = trimmed.match(/viewBox\s*=\s*["']\s*([-\d.]+)[,\s]+([-\d.]+)[,\s]+([-\d.]+)[,\s]+([-\d.]+)\s*["']/i);
    const widthMatch = trimmed.match(/width\s*=\s*["']([\d.]+)(?:px)?["']/i);
    const heightMatch = trimmed.match(/height\s*=\s*["']([\d.]+)(?:px)?["']/i);

    if (viewBoxMatch) {
      width = parseFloat(viewBoxMatch[3]);
      height = parseFloat(viewBoxMatch[4]);
    } else if (widthMatch && heightMatch) {
      width = parseFloat(widthMatch[1]);
      height = parseFloat(heightMatch[1]);
    }

    if (width > 0 && height > 0) {
      const ratio = width / height;
      aspectRatioStr = `${width} : ${height}`;
      // Allow minor floating point margin (0.99 to 1.01)
      if (Math.abs(ratio - 1) < 0.02) {
        isSquare = true;
      } else {
        errors.push(`লোগোটির অনুপাত ১:১ (Square) নয়! বর্তমান অনুপাত ${width}x${height}। BIMI এর জন্য লোগোটি অবশ্যই সমান চারকোণা (Square) হতে হবে।`);
      }
    } else {
      errors.push('SVG এর স্পষ্ট viewBox বা width/height খুঁজে পাওয়া যায়নি।');
    }

    // 6. File size (recommended <= 32 KB)
    const calculatedSizeKb = sizeBytes > 0 ? sizeBytes / 1024 : new Blob([trimmed]).size / 1024;
    const isSizeCompliant = calculatedSizeKb <= 32;
    if (!isSizeCompliant) {
      warnings.push(`লোগোর সাইজ (${calculatedSizeKb.toFixed(1)} KB) ৩২ KB এর চেয়ে বড়। জিমেইল/ইয়াহু BIMI এর জন্য ৩২ KB এর কম সাইজ রেকমেন্ড করে।`);
    }

    const result: BimiValidationResult = {
      isSvg,
      isSquare,
      aspectRatio: aspectRatioStr,
      hasTinyPsProfile,
      noScripts,
      noExternalResources,
      fileSizeKb: parseFloat(calculatedSizeKb.toFixed(1)),
      isSizeCompliant,
      dimensions: { width, height },
      rawSvg: trimmed,
      errors,
      warnings
    };

    setValidation(result);
    setSvgContent(trimmed);
    setFileName(name);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.svg') && file.type !== 'image/svg+xml') {
      alert('অনুগ্রহ করে একটি ভ্যালিড .svg ভেক্টর ফাইল আপলোড করুন।');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      validateSvg(content, file.name, file.size);
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    validateSvg(SAMPLE_GIFTGHOR_SVG, 'giftghor-bimi-sample.svg');
  };

  // One-click Auto-Fix & Compression for BIMI Tiny-PS (Reduces file size <= 32KB)
  const handleAutoFixForBimi = () => {
    if (!svgContent) return;

    let fixedSvg = svgContent;

    // 1. Remove XML prolog, DOCTYPE, and comments
    fixedSvg = fixedSvg.replace(/<\?xml[^>]*\?>/gi, '');
    fixedSvg = fixedSvg.replace(/<!DOCTYPE[^>]*>/gi, '');
    fixedSvg = fixedSvg.replace(/<!--[\s\S]*?-->/g, '');

    // 2. Remove metadata, sodipodi, inkscape, editor tags & attributes
    fixedSvg = fixedSvg.replace(/<metadata[\s\S]*?<\/metadata>/gi, '');
    fixedSvg = fixedSvg.replace(/<sodipodi:namedview[\s\S]*?\/>/gi, '');
    fixedSvg = fixedSvg.replace(/<sodipodi:namedview[\s\S]*?<\/sodipodi:namedview>/gi, '');
    fixedSvg = fixedSvg.replace(/\s*(sodipodi|inkscape|xmlns:sodipodi|xmlns:inkscape|i:ext|sketch:type)="[^"]*"/gi, '');

    // 3. Remove scripts & inline handlers
    fixedSvg = fixedSvg.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    fixedSvg = fixedSvg.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '');

    // 4. Truncate long floating point numbers in d="..." path attributes to 2 decimal places
    fixedSvg = fixedSvg.replace(/d="([^"]+)"/gi, (match, pathData) => {
      const minifiedPath = pathData.replace(/(-?\d+\.\d{3,})/g, (numStr: string) => {
        return parseFloat(numStr).toFixed(2);
      });
      return `d="${minifiedPath}"`;
    });

    // 5. Truncate coordinates in attributes
    fixedSvg = fixedSvg.replace(/(x|y|cx|cy|r|rx|ry|x1|y1|x2|y2|width|height|stroke-width)="(-?\d+\.\d{3,})"/gi, (match, attr, numStr) => {
      return `${attr}="${parseFloat(numStr).toFixed(2)}"`;
    });

    // 6. Ensure version="1.2" and baseProfile="tiny-ps"
    if (/<svg\b[^>]*version=/i.test(fixedSvg)) {
      fixedSvg = fixedSvg.replace(/version\s*=\s*["'][^"']*["']/i, 'version="1.2"');
    } else {
      fixedSvg = fixedSvg.replace(/<svg\b/i, '<svg version="1.2"');
    }

    if (/<svg\b[^>]*baseProfile=/i.test(fixedSvg)) {
      fixedSvg = fixedSvg.replace(/baseProfile\s*=\s*["'][^"']*["']/i, 'baseProfile="tiny-ps"');
    } else {
      fixedSvg = fixedSvg.replace(/<svg\b/i, '<svg baseProfile="tiny-ps"');
    }

    // 7. Ensure square dimensions / viewBox
    if (validation && !validation.isSquare && validation.dimensions.width > 0 && validation.dimensions.height > 0) {
      const maxDim = Math.max(validation.dimensions.width, validation.dimensions.height);
      fixedSvg = fixedSvg.replace(/viewBox\s*=\s*["'][^"']*["']/i, `viewBox="0 0 ${maxDim} ${maxDim}" width="${maxDim}" height="${maxDim}"`);
    }

    // 8. Minify whitespace
    fixedSvg = fixedSvg.replace(/\s+/g, ' ').replace(/>\s+</g, '><').trim();

    validateSvg(fixedSvg, fileName.replace('.svg', '-32kb-bimi.svg'));
  };

  const handleDownloadCompliantSvg = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bimi-giftghor-logo.svg';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const bimiDnsRecord = `v=BIMI1; l=${logoHostedUrl}; a=;`;
  const dmarcDnsRecord = `v=DMARC1; p=quarantine; pct=100;`;

  const handleCopyBimiRecord = () => {
    navigator.clipboard.writeText(bimiDnsRecord);
    setCopiedRecord(true);
    setTimeout(() => setCopiedRecord(false), 2500);
  };

  const handleCopyDmarcRecord = () => {
    navigator.clipboard.writeText(dmarcDnsRecord);
    setCopiedDmarc(true);
    setTimeout(() => setCopiedDmarc(false), 2500);
  };

  const isBimiReady = validation && validation.isSvg && validation.isSquare && validation.noScripts && validation.noExternalResources && validation.hasTinyPsProfile;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xs font-sans">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold shrink-0">
            <Image className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <span>BIMI Logo Uploader & SVG Tiny P/S Validator</span>
              <span className="px-2 py-0.5 text-[10px] bg-slate-100 text-slate-700 rounded-full font-mono border border-slate-200">
                Email Avatar Standard
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Gmail, Yahoo এবং Apple Mail ইনবক্সে ব্র্যান্ড লোগো প্রদর্শনের জন্য স্কয়ার SVG Tiny P/S ফরম্যাট লোগো আপলোড ও ভ্যালিডেট করুন।
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLoadSample}
          className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center space-x-1.5 self-start sm:self-auto shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 text-orange-600" />
          <span>নমুনা GiftGhor লোগো দিয়ে টেস্ট করুন</span>
        </button>
      </div>

      {/* File Upload Box */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        <div className="md:col-span-7 space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 hover:border-orange-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/60 hover:bg-orange-50/20 transition-all space-y-3"
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".svg,image/svg+xml"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-500 flex items-center justify-center mx-auto shadow-xs">
              <Upload className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                আপনার চারকোণা (Square 1:1) SVG লোগো ফাইলটি এখানে আপলোড করুন
              </span>
              <span className="text-[11px] text-slate-500 block mt-1">
                Drag & Drop অথবা ক্লিক করে ফাইল সিলেক্ট করুন (.svg)
              </span>
            </div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-200/70 text-[10px] text-slate-700 font-medium">
              <Info className="w-3 h-3 text-slate-500" />
              <span>প্রয়োজনীয়তা: 1:1 Square, SVG Tiny PS, ≤ 32 KB</span>
            </div>
          </div>

          {fileName && (
            <div className="flex items-center justify-between text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center space-x-2 truncate">
                <FileCode className="w-4 h-4 text-orange-600 shrink-0" />
                <span className="font-mono font-bold text-slate-800 truncate">{fileName}</span>
                {validation && (
                  <span className="text-slate-500">({validation.fileSizeKb} KB)</span>
                )}
              </div>
              {validation && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  isBimiReady ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  {isBimiReady ? '✓ BIMI Compliant' : '⚠ Action Needed'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Live SVG Preview Box */}
        <div className="md:col-span-5 flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-2xl p-6 min-h-[200px] text-center space-y-3">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            লোগো প্রিভিউ (ইনবক্স অবতার ভিউ)
          </span>

          {svgContent ? (
            <div className="space-y-3">
              <div
                className="w-28 h-28 mx-auto rounded-full overflow-hidden border-2 border-slate-300 shadow-sm bg-white p-2 flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
              <span className="text-[11px] text-slate-500 block font-mono">
                {validation?.dimensions.width}px × {validation?.dimensions.height}px (1:1 Avatar)
              </span>
            </div>
          ) : (
            <div className="text-slate-400 space-y-2 py-4">
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center mx-auto text-slate-300">
                <Image className="w-8 h-8" />
              </div>
              <span className="text-xs block">লোগো আপলোড করলে এখানে প্রিভিউ দেখা যাবে</span>
            </div>
          )}
        </div>
      </div>

      {/* BIMI Requirements Validation Checklist */}
      {validation && (
        <div className="space-y-4 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-orange-600" />
              <span>BIMI স্পেসিফিকেশন অডিট রিপোর্ট (Compliance Audit):</span>
            </h4>

            {!isBimiReady && (
              <button
                type="button"
                onClick={handleAutoFixForBimi}
                className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-colors flex items-center space-x-1.5 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>⚡ 32 KB তে অটো-কমপ্রেস & BIMI ফিক্স করুন</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {/* Rule 1: Square Aspect Ratio */}
            <div className={`p-3.5 rounded-xl border flex items-start space-x-2.5 ${
              validation.isSquare ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'
            }`}>
              {validation.isSquare ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold text-slate-900 block">1:1 Square অনুপাত</span>
                <span className="text-[11px] text-slate-600">
                  {validation.isSquare ? `সঠিক অনুপাত (${validation.aspectRatio})` : 'ব্যর্থ: সমান চারকোণা নয়'}
                </span>
              </div>
            </div>

            {/* Rule 2: SVG Tiny P/S Profile */}
            <div className={`p-3.5 rounded-xl border flex items-start space-x-2.5 ${
              validation.hasTinyPsProfile ? 'bg-emerald-50/60 border-emerald-200' : 'bg-amber-50/60 border-amber-200'
            }`}>
              {validation.hasTinyPsProfile ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold text-slate-900 block">SVG Tiny P/S Profile</span>
                <span className="text-[11px] text-slate-600">
                  {validation.hasTinyPsProfile ? 'যুক্ত আছে (baseProfile="tiny-ps")' : 'মিসিং: Auto-Fix দিয়ে যোগ করুন'}
                </span>
              </div>
            </div>

            {/* Rule 3: No Scripts */}
            <div className={`p-3.5 rounded-xl border flex items-start space-x-2.5 ${
              validation.noScripts ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'
            }`}>
              {validation.noScripts ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold text-slate-900 block">স্ক্রিপ্ট ও ম্যালওয়্যার ফ্রি</span>
                <span className="text-[11px] text-slate-600">
                  {validation.noScripts ? 'নিরাপদ (কোনো <script> নেই)' : 'বিপদ: স্ক্রিপ্ট ট্যাগ রয়েছে'}
                </span>
              </div>
            </div>

            {/* Rule 4: No External Resources */}
            <div className={`p-3.5 rounded-xl border flex items-start space-x-2.5 ${
              validation.noExternalResources ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'
            }`}>
              {validation.noExternalResources ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold text-slate-900 block">সেলফ-কন্টেইন্ড ভেক্টর</span>
                <span className="text-[11px] text-slate-600">
                  {validation.noExternalResources ? 'কোনো এক্সটার্নাল রিসোর্স নেই' : 'বাহ্যিক ইমেজ লিংক পাওয়া গেছে'}
                </span>
              </div>
            </div>

            {/* Rule 5: File Size Check */}
            <div className={`p-3.5 rounded-xl border flex items-start space-x-2.5 ${
              validation.isSizeCompliant ? 'bg-emerald-50/60 border-emerald-200' : 'bg-amber-50/60 border-amber-200'
            }`}>
              {validation.isSizeCompliant ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold text-slate-900 block">ফাইল সাইজ (≤ 32 KB)</span>
                <span className="text-[11px] text-slate-600">
                  {validation.fileSizeKb} KB ({validation.isSizeCompliant ? 'অনুমোদিত' : '৩২ কেবি অতিক্রম করেছে'})
                </span>
              </div>
            </div>

            {/* Rule 6: XML Root Check */}
            <div className={`p-3.5 rounded-xl border flex items-start space-x-2.5 ${
              validation.isSvg ? 'bg-emerald-50/60 border-emerald-200' : 'bg-rose-50/60 border-rose-200'
            }`}>
              {validation.isSvg ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-bold text-slate-900 block">XML ভেক্টর ফরম্যাট</span>
                <span className="text-[11px] text-slate-600">
                  {validation.isSvg ? 'ভ্যালিড SVG ডেটা' : 'অকার্যকর ফরম্যাট'}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons if compliant */}
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="button"
              onClick={handleDownloadCompliantSvg}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors flex items-center space-x-2 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ভ্যালিডেটেড SVG Tiny PS লোগো ডাউনলোড করুন</span>
            </button>
          </div>
        </div>
      )}

      {/* BIMI DNS TXT Generator Section */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
            <span>Cloudflare এ বসানোর জন্য BIMI DNS রেকর্ড (BIMI DNS Record Generator):</span>
          </h4>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            আপনার ভ্যালিডেটেড SVG লোগোটি আপনার ওয়েবসাইটে আপলোড করে তার পাবলিক URL টি নিচে বসান। এরপর জেনারেটকৃত DNS রেকর্ডটি Cloudflare এ যুক্ত করুন:
          </p>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-700 uppercase mb-1">
            আপনার হোস্টেড SVG লোগোর পাবলিক URL (Hosted Logo HTTPS URL):
          </label>
          <input
            type="url"
            value={logoHostedUrl}
            onChange={(e) => setLogoHostedUrl(e.target.value)}
            placeholder="https://giftghor.world/giftghor-logo.svg"
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-900"
          />
        </div>

        {/* DNS Table Preview */}
        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
          <table className="w-full text-left font-mono text-xs text-slate-800">
            <thead className="bg-slate-100 text-slate-500 uppercase border-b border-slate-200 text-[11px]">
              <tr>
                <th className="p-3">Type</th>
                <th className="p-3">Name / Host</th>
                <th className="p-3">Content / Value</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 font-bold text-orange-600">TXT (BIMI)</td>
                <td className="p-3 font-bold text-slate-900">default._bimi</td>
                <td className="p-3 text-slate-700 truncate max-w-xs">{bimiDnsRecord}</td>
                <td className="p-3 text-right">
                  <button
                    type="button"
                    onClick={handleCopyBimiRecord}
                    className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors inline-flex items-center space-x-1"
                  >
                    {copiedRecord ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-blue-600">TXT (DMARC)</td>
                <td className="p-3 font-bold text-slate-900">_dmarc</td>
                <td className="p-3 text-slate-700 truncate max-w-xs">{dmarcDnsRecord}</td>
                <td className="p-3 text-right">
                  <button
                    type="button"
                    onClick={handleCopyDmarcRecord}
                    className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors inline-flex items-center space-x-1"
                  >
                    {copiedDmarc ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start space-x-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <span className="leading-relaxed">
            <strong>টিপস:</strong> BIMI লোগো ইনবক্সে দৃশ্যমান হওয়ার জন্য ডোমেইনের DMARC নীতি অবশ্যই <strong className="font-mono text-blue-950">p=quarantine</strong> অথবা <strong className="font-mono text-blue-950">p=reject</strong> এ সেট করা থাকতে হবে।
          </span>
        </div>
      </div>
    </div>
  );
};
