import React, { useState } from 'react';
import {
  Sparkles,
  Wand2,
  CheckCircle2,
  Loader2,
  X,
  FileText,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import { parsePropertyWithAI } from '../services/aiPropertyParser';

const SAMPLE_LISTINGS = [
  {
    label: "3BHK New Town",
    text: "3 BHK for rent in New Town Action Area 2 near Ecospace, 1350 sqft, rent 26000/mo, deposit 50k, semi furnished with lift, car parking, 24/7 security, gym, balcony. Call broker Rahul at 9830123456"
  },
  {
    label: "2BHK Shapoorji",
    text: "2 BHK flat available in Sukhobristhi Complex, Shapoorji. 920 sqft, Rent 16500, Deposit 33000. Fully Furnished with power backup, gated security, water supply, lift. Landlord: Amit Sen 9831098765"
  },
  {
    label: "Sale Flat Rajarhat",
    text: "Spacious 3 BHK apartment for sale in Rajarhat Chinar Park. Super builtup 1480 sqft. Expected price 68 Lakhs. Gated society with swimming pool, gym, cctv, intercom, 1 covered car parking. Call 9874512345"
  }
];

export default function AiPropertyQuickBox({
  onParsedProperty,
  showToast,
  isDark = true
}) {
  const [rawText, setRawText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [lastParsedSummary, setLastParsedSummary] = useState(null);

  const handleParse = async () => {
    if (!rawText.trim()) {
      if (showToast) showToast("⚠️ Please enter or paste some flat details first.");
      return;
    }

    setIsParsing(true);
    try {
      const parsed = await parsePropertyWithAI(rawText);
      if (onParsedProperty) {
        onParsedProperty(parsed);
      }

      setLastParsedSummary({
        title: parsed.title,
        bhk: parsed.bhk,
        price: parsed.price,
        listingType: parsed.listingType,
        location: parsed.location,
        subLocation: parsed.subLocation,
        furnishing: parsed.furnishing,
        amenitiesCount: (parsed.amenities || []).length
      });

      if (showToast) {
        showToast("✨ AI successfully extracted & labeled all flat details!");
      }
    } catch (err) {
      console.error("[AiPropertyQuickBox] Parse error:", err);
      if (showToast) {
        showToast(`⚠️ Could not parse: ${err.message || "Please check details"}`);
      }
    } finally {
      setIsParsing(false);
    }
  };

  const handleApplySample = (sampleText) => {
    setRawText(sampleText);
  };

  const handleClear = () => {
    setRawText('');
    setLastParsedSummary(null);
  };

  return (
    <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
      isDark
        ? 'bg-gradient-to-br from-violet-950/40 via-slate-900 to-blue-950/30 border-violet-500/30 shadow-lg'
        : 'bg-gradient-to-br from-violet-50 via-white to-blue-50 border-violet-200 shadow-md'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-blue-600 text-white flex items-center justify-center shadow-md shadow-violet-500/20">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-black text-sm text-violet-400 dark:text-violet-300 tracking-tight">
                AI Details Filler
              </span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 border border-violet-500/30">
                Auto Fill
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Paste flat details or WhatsApp message below to fill the form in 1 click.
            </p>
          </div>
        </div>

        {rawText && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs font-bold text-slate-400 hover:text-rose-400 flex items-center space-x-1 cursor-pointer transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Raw Text Box */}
      <div className="relative">
        <textarea
          rows={3}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Paste message or notes here (e.g. 2 BHK in New Town, 18k rent, lift, parking)..."
          className={`w-full p-3 rounded-xl border text-xs outline-none transition-all resize-y font-medium leading-relaxed ${
            isDark
              ? 'bg-slate-900/95 border-slate-700/80 text-slate-100 placeholder-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20'
              : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 shadow-xs'
          }`}
        />
        <div className="absolute bottom-2 right-2.5 text-[10px] text-slate-500 select-none">
          {rawText.length > 0 ? `${rawText.length} characters` : ''}
        </div>
      </div>

      {/* Quick Test Chips & Parse Action */}
      <div className="flex items-center justify-between mt-3 flex-wrap gap-2.5">
        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-0.5">
            Examples:
          </span>
          {SAMPLE_LISTINGS.map((sample, idx) => (
            <button
              type="button"
              key={idx}
              onClick={() => handleApplySample(sample.text)}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                isDark
                  ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
              }`}
            >
              📋 {sample.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={isParsing || !rawText.trim()}
          onClick={handleParse}
          className={`px-5 py-2.5 rounded-xl font-black text-xs flex items-center space-x-2 shadow-lg transition-all cursor-pointer ${
            isParsing || !rawText.trim()
              ? 'bg-slate-700 text-slate-400 opacity-60 cursor-not-allowed'
              : 'bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white active:scale-95 shadow-violet-500/30 ring-1 ring-violet-400/30'
          }`}
        >
          {isParsing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Filling details...</span>
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              <span>Fill Form with AI</span>
            </>
          )}
        </button>
      </div>

      {/* Extracted Label Breakdown */}
      {lastParsedSummary && (
        <div className={`mt-3 p-3 rounded-xl border transition-all ${
          isDark
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-1.5 font-black text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Form filled successfully:</span>
            </div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md">
              Filled ✓
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-2 text-[11px] font-semibold">
            <span className="px-2 py-0.5 rounded bg-black/20 font-bold">
              🏷️ {lastParsedSummary.bhk}
            </span>
            <span className="px-2 py-0.5 rounded bg-black/20 font-bold">
              💰 ₹{Number(lastParsedSummary.price).toLocaleString('en-IN')}{lastParsedSummary.listingType === 'rent' ? '/mo' : ''}
            </span>
            <span className="px-2 py-0.5 rounded bg-black/20 font-bold">
              📍 {lastParsedSummary.location}
            </span>
            {lastParsedSummary.subLocation && (
              <span className="px-2 py-0.5 rounded bg-black/20">
                🏢 {lastParsedSummary.subLocation}
              </span>
            )}
            <span className="px-2 py-0.5 rounded bg-black/20">
              🛋️ {lastParsedSummary.furnishing}
            </span>
            <span className="px-2 py-0.5 rounded bg-black/20">
              ✨ {lastParsedSummary.amenitiesCount} Amenities
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
