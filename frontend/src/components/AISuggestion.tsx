import { useState } from "react";
import { BiStar } from "react-icons/bi";
import { toast } from "react-hot-toast";

interface AISuggestionProps {
  title: string;
  description?: string;
  placeholder?: string;
  buttonText: string;
  apiCall: (input: string) => Promise<any>;
  extractResult: (res: any) => string;
  disabled?: boolean;
}

const AISuggestion = ({ title, description, placeholder, buttonText, apiCall, extractResult, disabled }: AISuggestionProps) => {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await apiCall(input);
      setResult(extractResult(res));
    } catch {
      toast.error("Failed to get suggestion. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border border-amber-100 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <BiStar className="h-5 w-5 text-amber-500" />
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      </div>
      {description && <p className="mt-2 text-sm text-slate-500">{description}</p>}
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder || ""}
        className="mt-4 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:ring-2 focus:ring-amber-200 resize-none"
        rows={2}
      />
      <button
        onClick={handleSubmit}
        disabled={loading || disabled || !input.trim()}
        className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:from-amber-600 hover:to-orange-600 disabled:opacity-60"
      >
        <BiStar className="h-4 w-4" />
        {loading ? "Thinking..." : buttonText}
      </button>
      {result && (
        <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 whitespace-pre-line">
          {result}
        </div>
      )}
    </div>
  );
};

export default AISuggestion;
