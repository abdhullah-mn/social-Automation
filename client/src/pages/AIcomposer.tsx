import { useEffect, useState } from "react";
import {
  Sparkles,
  Copy,
  RefreshCw,
  Calendar,
  Clock,
  Loader2,
  X,
} from "lucide-react";
import { PLATFORMS } from "../assets/assets";

interface Generation {
  id: string;
  content: string;
  tone: string;
  prompt: string;
  createdAt: string;
}

const dummyGenerationData: Generation[] = [
  {
    id: "gen_1",
    content: "Craft an inspiring announcement for your latest product launch with a professional tone, emphasizing benefits and customer value.",
    tone: "Professional",
    prompt: "Announce a new product launch",
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    id: "gen_2",
    content: "Share a quick, upbeat tip about staying productive, with a friendly and casual voice to engage your audience.",
    tone: "Casual",
    prompt: "Write a productivity tip",
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
];

const AIcomposer = () => {
  const [prompt, setPrompt] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [generating, setGenerating] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(false);
  const [tone, setTone] = useState("Professional");

  const tones = [
    "Professional",
    "Casual",
    "Humorous",
    "Inspirational",
    "Creative",
    "Minimalist",
    "Excited",
  ];

  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduling, setScheduling] = useState(false);
  const [activeSheduler, setActiveSheduler] = useState<string | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [sheduleDate, setSheduleDate] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(true);

  const getTodayDateString = () => {
    return new Date().toISOString().split("T")[0];
  };

  const fetchGenerations = async () => {
    setGenerating(dummyGenerationData);
  };

  useEffect(() => {
    const load = async () => {
      setLoadingHistory(true);
      await fetchGenerations();
      setLoadingHistory(false);
    };
    load();
  }, []);

  const formatRelativeTime = (dateString: string) => {
    const then = new Date(dateString).getTime();
    const diffSeconds = Math.floor((Date.now() - then) / 1000);
    if (diffSeconds < 60) return "Just now";
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return `${Math.floor(diffSeconds / 86400)}d ago`;
  };

  const generateContent = async (basePrompt: string, baseTone: string) => {
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const result = `Here's a ${baseTone.toLowerCase()} social post about: ${basePrompt}. Feel free to tweak it for your audience.`;
    const newEntry: Generation = {
      id: `gen_${Date.now()}`,
      content: result,
      tone: baseTone,
      prompt: basePrompt,
      createdAt: new Date().toISOString(),
    };
    dummyGenerationData.unshift(newEntry);
    await fetchGenerations();
    setGeneratedContent(result);
    setLoading(false);
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;
    await generateContent(prompt.trim(), tone);
  };

  const handleRegenerate = async () => {
    if (!prompt.trim() || loading) return;
    await generateContent(prompt.trim(), tone);
  };

  const handleCopy = async () => {
    if (!generatedContent) return;
    try {
      await navigator.clipboard.writeText(generatedContent);
    } catch {
      // ignore copy failures in unsupported environments
    }
  };

  const handleLoadGeneration = (item: Generation) => {
    setGeneratedContent(item.content);
    setTone(item.tone);
    setPrompt(item.prompt);
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((id) => id !== platformId)
        : [...prev, platformId]
    );
  };

  const canConfirmSchedule = () => {
    if (!selectedPlatforms.length || !sheduleDate || !scheduleTime) return false;
    const selectedDateTime = new Date(`${sheduleDate}T${scheduleTime}`);
    return selectedDateTime > new Date();
  };

  const handleConfirmSchedule = async () => {
    if (!canConfirmSchedule() || !activeSheduler) return;
    setScheduling(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setScheduling(false);
    setActiveSheduler(null);
    setSelectedPlatforms([]);
    setSheduleDate("");
    setScheduleTime("");
  };

  const clearGenerated = () => {
    setGeneratedContent("");
  };

  const historyItems = [...generating].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-4">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">AI Post Composer</h1>
                <p className="text-slate-500 mt-1 text-sm">Describe what you want the AI to write, then generate and refine your post.</p>
              </div>
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || loading}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Generate
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  placeholder="Describe the post idea you want AI to generate..."
                  className="mt-2 w-full border border-slate-300 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
                />
                <p className="text-xs text-slate-500 mt-1">Use one or two sentences for the best results.</p>
              </div>

              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Tone</p>
                <div className="flex flex-wrap gap-2">
                  {tones.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setTone(option)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        tone === option
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {generatedContent && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Generated Content</h2>
                  <p className="text-slate-500 text-sm mt-1">Edit the AI text before scheduling or exporting.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <Copy className="size-4" />
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                    Regenerate
                  </button>
                  <button
                    type="button"
                    onClick={clearGenerated}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <X className="size-4" />
                    Clear
                  </button>
                </div>
              </div>

              <textarea
                value={generatedContent}
                onChange={(e) => setGeneratedContent(e.target.value)}
                rows={8}
                className="w-full border border-slate-300 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-slate-300 resize-none"
              />
              <div className="text-right text-xs text-slate-500 mt-2">
                {generatedContent.length} characters
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="size-5 text-slate-900" />
              <h2 className="text-lg font-semibold text-slate-900">Generation History</h2>
            </div>

            {loadingHistory ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-24 rounded-2xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : generating.length === 0 ? (
              <div className="text-slate-500 text-sm">No generations yet. Use the prompt above to create your first AI post.</div>
            ) : (
              <div className="space-y-4">
                {historyItems.map((item) => (
                  <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                          {item.tone}
                        </div>
                        <p className="mt-3 text-slate-900 text-sm line-clamp-2">{item.content}</p>
                        <p className="text-xs text-slate-500 mt-2">{formatRelativeTime(item.createdAt)}</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => handleLoadGeneration(item)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors text-sm"
                        >
                          Load
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveSheduler(item.id)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors text-sm"
                        >
                          Schedule
                        </button>
                      </div>
                    </div>

                    {activeSheduler === item.id && (
                      <div className="mt-4 border-t border-slate-200 pt-4 space-y-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-slate-700">Schedule this post</p>
                          <button
                            type="button"
                            onClick={() => setActiveSheduler(null)}
                            className="text-slate-500 hover:text-slate-900"
                          >
                            <X className="size-4" />
                          </button>
                        </div>

                        <div>
                          <p className="text-sm font-medium text-slate-700 mb-2">Platforms</p>
                          <div className="flex flex-wrap gap-2">
                            {PLATFORMS.map((platform) => (
                              <button
                                key={platform.id}
                                type="button"
                                onClick={() => togglePlatform(platform.id)}
                                className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                                  selectedPlatforms.includes(platform.id)
                                    ? "bg-slate-900 text-white"
                                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                }`}
                              >
                                {platform.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <label className="block text-sm text-slate-700">
                            Date
                            <input
                              type="date"
                              value={sheduleDate}
                              min={getTodayDateString()}
                              onChange={(e) => setSheduleDate(e.target.value)}
                              className="mt-2 w-full border border-slate-300 rounded-2xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
                            />
                          </label>
                          <label className="block text-sm text-slate-700">
                            Time
                            <input
                              type="time"
                              value={scheduleTime}
                              onChange={(e) => setScheduleTime(e.target.value)}
                              className="mt-2 w-full border border-slate-300 rounded-2xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
                            />
                          </label>
                        </div>

                        <div className="flex flex-wrap gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => setActiveSheduler(null)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors text-sm"
                          >
                            <X className="size-4" />
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleConfirmSchedule}
                            disabled={!canConfirmSchedule() || scheduling}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                          >
                            {scheduling ? <Loader2 className="size-4 animate-spin" /> : <Calendar className="size-4" />}
                            Confirm Schedule
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIcomposer;

