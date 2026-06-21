import { useEffect, useState } from "react";
import { PLATFORMS } from "../assets/assets";
import {
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  Image as ImageIcon,
  X as XIcon,
  Trash2 as TrashIcon,
  Edit as EditIcon,
  Plus as PlusIcon,
  Loader2 as LoaderIcon,
  CheckCircle as CheckCircleIcon,
} from "lucide-react";

// Define the ScheduledPost type
interface ScheduledPost {
  id: string;
  content: string;
  platforms: string[];
  mediaUrls: string[];
  scheduleDate: string;
  scheduleTime: string;
  status: "draft" | "scheduled" | "published" | "failed";
}

const dummyPostData: ScheduledPost[] = [
  {
    id: "post_1",
    content: "Just launched our new feature! Check it out 🚀",
    platforms: ["twitter", "linkedin"],
    mediaUrls: ["img1.jpg"],
    scheduleDate: "2026-06-25",
    scheduleTime: "10:00",
    status: "scheduled",
  },
  {
    id: "post_2",
    content: "Working on something cool today",
    platforms: ["instagram"],
    mediaUrls: [],
    scheduleDate: "2026-06-22",
    scheduleTime: "15:30",
    status: "draft",
  },
  {
    id: "post_3",
    content: "Thanks everyone for the amazing feedback!",
    platforms: ["facebook", "twitter"],
    mediaUrls: [],
    scheduleDate: "2026-06-18",
    scheduleTime: "09:00",
    status: "published",
  },
];

const Sheduler = () => {

  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [content, setContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [scheduledTime, setScheduledTime] = useState("");
  const [loading, setLoading] = useState(false);
  const [sheduleDate, setSheduleDate] = useState("");
  const [mediafiles, setMediaFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  const fetchPosts = async () => {
    setPosts(dummyPostData);
  };

  useEffect(() => {
    (async () => await fetchPosts())();
  }, []);

  // Toggle platform selection
  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platformId)
        ? prev.filter((p) => p !== platformId)
        : [...prev, platformId]
    );
  };

  // Handle media file upload
  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files) {
      setMediaFiles((prev) => [...prev, ...Array.from(files)]);
    }
  };

  // Remove media file
  const removeMediaFile = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Validate and submit
  const handleSubmit = async (asDraft: boolean) => {
    setError("");

    // Validation
    if (!content.trim()) {
      setError("Post content cannot be empty");
      return;
    }
    if (selectedPlatforms.length === 0) {
      setError("Select at least one platform");
      return;
    }
    if (!asDraft) {
      if (!sheduleDate || !scheduledTime) {
        setError("Date and time are required for scheduling");
        return;
      }
      const selectedDateTime = new Date(`${sheduleDate}T${scheduledTime}`);
      if (selectedDateTime <= new Date()) {
        setError("Cannot schedule for a past date/time");
        return;
      }
    }

    setLoading(true);
    // Simulate submission
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const newPost: ScheduledPost = {
      id: editingPostId || `post_${Date.now()}`,
      content,
      platforms: selectedPlatforms,
      mediaUrls: mediafiles.map((f) => f.name),
      scheduleDate: sheduleDate,
      scheduleTime: scheduledTime,
      status: asDraft ? "draft" : "scheduled",
    };

    if (editingPostId) {
      setPosts((prev) => prev.map((p) => (p.id === editingPostId ? newPost : p)));
      setEditingPostId(null);
    } else {
      setPosts((prev) => [...prev, newPost]);
    }

    // Reset form
    setContent("");
    setSelectedPlatforms([]);
    setSheduleDate("");
    setScheduledTime("");
    setMediaFiles([]);
    setLoading(false);
  };

  // Edit post
  const handleEditPost = (post: ScheduledPost) => {
    setContent(post.content);
    setSelectedPlatforms(post.platforms);
    setSheduleDate(post.scheduleDate);
    setScheduledTime(post.scheduleTime);
    setEditingPostId(post.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Delete post
  const handleDeletePost = (postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  // Get status counts
  const statusCounts = {
    scheduled: posts.filter((p) => p.status === "scheduled").length,
    draft: posts.filter((p) => p.status === "draft").length,
    published: posts.filter((p) => p.status === "published").length,
    failed: posts.filter((p) => p.status === "failed").length,
  };

  // Get today's date string
  const getTodayDateString = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  // Sort posts by date descending
  const sortedPosts = [...posts].sort(
    (a, b) =>
      new Date(`${b.scheduleDate}T${b.scheduleTime}`).getTime() -
      new Date(`${a.scheduleDate}T${a.scheduleTime}`).getTime()
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Scheduler</h1>
          <p className="text-slate-500 text-sm mt-1">
            {statusCounts.scheduled} scheduled, {statusCounts.draft} draft,{" "}
            {statusCounts.published} published
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compose Panel */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm sticky top-4">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              {editingPostId ? "Edit Post" : "Create New Post"}
            </h2>

            {/* Content Textarea */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Post Content
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                rows={4}
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-slate-500">{content.length} characters</span>
                <span className={`text-xs ${content.length > 280 ? "text-red-500" : "text-slate-500"}`}>
                  {280 - content.length} remaining
                </span>
              </div>
            </div>

            {/* Platform Selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Platforms
              </label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map((platform) => {
                  const Icon = platform.icon;
                  const isSelected = selectedPlatforms.includes(platform.id);
                  return (
                    <button
                      key={platform.id}
                      onClick={() => togglePlatform(platform.id)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isSelected
                          ? "bg-red-500 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      <Icon className="size-3.5" />
                      {platform.name.split(" ")[0]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Media Upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Media
              </label>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg p-4 cursor-pointer hover:border-red-500 transition-colors">
                <ImageIcon className="size-6 text-slate-400 mb-2" />
                <span className="text-xs text-slate-600 text-center">
                  Drag or click to upload
                </span>
                <input
                  type="file"
                  multiple
                accept="imagewe/*,video/*"
                  onChange={handleMediaUpload}
                  className="hidden"
                />
              </label>
              {mediafiles.length > 0 && (
                <div className="mt-2 space-y-2">
                  {mediafiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded">
                      <span className="text-xs text-slate-700 truncate">{file.name}</span>
                      <button
                        onClick={() => removeMediaFile(idx)}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <XIcon className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Date & Time */}
            <div className="mb-4 space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Schedule Date
              </label>
              <input
                type="date"
                value={sheduleDate}
                onChange={(e) => setSheduleDate(e.target.value)}
                min={getTodayDateString()}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="mb-4 space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Schedule Time
              </label>
              <input
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="space-y-2">
              <button
                onClick={() => handleSubmit(false)}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed font-medium"
              >
                {loading ? <LoaderIcon className="size-4 animate-spin" /> : <CalendarIcon className="size-4" />}
                {editingPostId ? "Update Schedule" : "Schedule Post"}
              </button>
              <button
                onClick={() => handleSubmit(true)}
                disabled={loading}
                className="w-full px-4 py-2 bg-slate-100 text-slate-900 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed font-medium text-sm"
              >
                Save as Draft
              </button>
              {editingPostId && (
                <button
                  onClick={() => {
                    setEditingPostId(null);
                    setContent("");
                    setSelectedPlatforms([]);
                    setSheduleDate("");
                    setScheduledTime("");
                    setMediaFiles([]);
                    setError("");
                  }}
                  className="w-full px-4 py-2 bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Posts List */}
        <div className="lg:col-span-2 space-y-4">
          {loading && posts.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <LoaderIcon className="size-8 text-slate-400 animate-spin" />
            </div>
          ) : sortedPosts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="flex items-center justify-center mb-4 size-16 bg-slate-100 rounded-full">
                <PlusIcon className="size-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-800 mt-2">No posts yet</h3>
              <p className="text-slate-500 text-sm mt-1 text-center">
                Create your first post using the composer on the left
              </p>
            </div>
          ) : (
            sortedPosts.map((post) => {
              const statusColors = {
                draft: "bg-slate-100 text-slate-700",
                scheduled: "bg-blue-50 text-blue-700",
                published: "bg-green-50 text-green-700",
                failed: "bg-red-50 text-red-700",
              };
              const postDate = new Date(`${post.scheduleDate}T${post.scheduleTime}`);
              const isToday =
                postDate.toDateString() === new Date().toDateString();

              return (
                <div
                  key={post.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 text-sm line-clamp-2">{post.content}</p>
                    </div>
                    <span
                      className={`ml-3 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        statusColors[post.status]
                      }`}
                    >
                      {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                    </span>
                  </div>

                  {/* Platforms */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {post.platforms.map((platformId) => {
                      const platform = PLATFORMS.find((p) => p.id === platformId);
                      const Icon = platform?.icon;
                      return Icon ? (
                        <div
                          key={platformId}
                          className="size-7 flex items-center justify-center bg-slate-100 rounded text-slate-600"
                        >
                          <Icon className="size-4" />
                        </div>
                      ) : null;
                    })}
                    {post.mediaUrls.length > 0 && (
                      <div className="size-7 flex items-center justify-center bg-slate-100 rounded text-slate-600 text-xs font-medium">
                        {post.mediaUrls.length}
                      </div>
                    )}
                  </div>

                  {/* Date & Time */}
                  <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="size-3.5" />
                      {isToday ? "Today" : postDate.toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <ClockIcon className="size-3.5" />
                      {post.scheduleTime}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditPost(post)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
                    >
                      <EditIcon className="size-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                    >
                      <TrashIcon className="size-4" />
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Sheduler;