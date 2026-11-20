import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CATEGORIES } from "../utils/mockData.js";

function PostItem() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Books",
    looking_for: "",
    image_url: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        e.target.value = "";
        setImagePreview("");
        setError("Image must be less than 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("description", form.description);
      formData.append("category", form.category);
      formData.append("looking_for", form.looking_for);
      if (e.target.image.files[0]) {
        formData.append("image", e.target.image.files[0]);
      }

      const res = await fetch("/api/items", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("hostelbarter_token")}`,
        },
        body: formData,
      });
      if (res.ok) {
        navigate("/my-listings");
      } else {
        throw new Error("API failed");
      }
    } catch {
      setError(
        "Listing was not posted. Check the image format, your connection and login, then retry.",
      );
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-gray-900">Post an Item</h1>
        <p className="text-gray-500 mt-1">
          List something you'd like to barter or share
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card p-8 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Item Photo
          </label>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl text-gray-400">📷</span>
              )}
            </div>
            <div>
              <label className="btn-secondary text-sm cursor-pointer inline-block">
                Choose Image
                <input
                  type="file"
                  name="image"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
              <p className="text-xs text-gray-400 mt-1">JPG, PNG up to 5MB</p>
            </div>
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Item Title *
          </label>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            className="input-field"
            placeholder="e.g., Engineering Mathematics Textbook"
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Description *
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            className="input-field min-h-25 resize-y"
            placeholder="Describe the item's condition, usage, etc."
            required
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Category *
          </label>
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="input-field"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Looking For */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Looking For (in exchange) *
          </label>
          <input
            type="text"
            name="looking_for"
            value={form.looking_for}
            onChange={handleChange}
            className="input-field"
            placeholder='e.g., "Data Structures book" or "Free/Share"'
            required
          />
          <p className="text-xs text-gray-400 mt-1">
            What would you like in exchange? Write "Free/Share" if giving away.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary flex-1 text-center"
          >
            {loading ? "Posting..." : "🚀 Post Item"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default PostItem;
