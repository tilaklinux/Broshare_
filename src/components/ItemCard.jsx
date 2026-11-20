import ListingPhoto from "./ListingPhoto.jsx";
import { OfferForm } from "./Proposals.jsx";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const categoryColors = {
  Books: "bg-blue-100 text-blue-700",
  Electronics: "bg-purple-100 text-purple-700",
  Accessories: "bg-amber-100 text-amber-700",
  Essentials: "bg-green-100 text-green-700",
  Other: "bg-gray-100 text-gray-700",
};

const categoryIcons = {
  Books: "📚",
  Electronics: "🔌",
  Accessories: "🎒",
  Essentials: "🏠",
  Other: "📦",
};

function ItemCard({ item }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleMessage = (e) => {
    e.stopPropagation();
    if (!user) {
      navigate("/login");
      return;
    }
    navigate(`/chat/${item.user_id}`, { state: { item } });
  };

  const timeAgo = (dateStr) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    if (diff < 7) return `${diff} days ago`;
    if (diff < 30) return `${Math.floor(diff / 7)} weeks ago`;
    return `${Math.floor(diff / 30)} months ago`;
  };

  return (
    <div className="card group">
      {/* Image Area */}
      <div className="relative h-44 bg-linear-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden">
        {item.image_url ? (
          <ListingPhoto src={item.image_url} title={item.title} />
        ) : (
          <div className="text-5xl opacity-60">
            {categoryIcons[item.category] || "📦"}
          </div>
        )}
        <span
          className={`pointer-events-none absolute top-3 left-3 px-2.5 py-1 rounded-lg text-xs font-semibold ${categoryColors[item.category] || categoryColors.Other}`}
        >
          {item.category}
        </span>
        {item.status === "bartered" && (
          <div className="pointer-events-none absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-red-500 text-white px-4 py-1.5 rounded-full text-sm font-bold">
              BARTERED
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1.5 line-clamp-1">
          {item.title}
        </h3>
        <p className="text-gray-500 text-sm mb-3 line-clamp-2">
          {item.description}
        </p>

        {/* Looking For */}
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 mb-3">
          <p className="text-xs text-emerald-600 font-medium">Looking for:</p>
          <p className="text-sm text-emerald-800 font-semibold">
            {item.looking_for}
          </p>
        </div>

        {/* Owner Info */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 bg-emerald-100 rounded-full flex items-center justify-center text-xs font-bold text-emerald-700">
            {(item.user_name || "U").charAt(0)}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">
              {item.user_name || "Student"}
            </p>
            <p className="text-xs text-gray-400">
              {item.hostel_name} · Room {item.room_number}
            </p>
          </div>
          <span className="ml-auto text-xs text-gray-400">
            {timeAgo(item.created_at)}
          </span>
        </div>

        {user && item.user_id !== user.id && item.status === "available" && (
          <OfferForm target={item.id} />
        )}
        {/* Action Button */}
        {item.status === "available" && item.user_id !== user?.id && (
          <button
            onClick={handleMessage}
            className="w-full btn-primary text-sm py-2.5 flex items-center justify-center gap-2"
          >
            💬 Message Owner
          </button>
        )}
      </div>
    </div>
  );
}

export default ItemCard;
