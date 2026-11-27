import ListingPhoto from '../components/ListingPhoto.jsx';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { IncomingOffers } from '../components/Proposals.jsx';
import { CATEGORIES } from '../utils/mockData.js';

const categoryIcons = {
  Books: "📚",
  Electronics: "🔌",
  Accessories: "🎒",
  Essentials: "🏠",
  Other: "📦",
};

function MyListings() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [uploadingId, setUploadingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", category: "Other", looking_for: "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    try {
      const res = await fetch("/api/items/my-items", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("hostelbarter_token")}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      } else {
        throw new Error("API failed");
      }
    } catch {
      setError("Could not contact the server. Please try again.");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, [user.id]);

  const markAsBartered = async (itemId) => {
    try {
      const res = await fetch(`/api/items/${itemId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("hostelbarter_token")}`,
        },
        body: JSON.stringify({ status: "bartered" }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setError("Listing could not be updated.");
    }
    fetchItems();
  };

  const markAsAvailable = async (itemId) => {
    try {
      const res = await fetch(`/api/items/${itemId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("hostelbarter_token")}`,
        },
        body: JSON.stringify({ status: "available" }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setError("Listing could not be updated.");
    }
    fetchItems();
  };

  const uploadPhoto = async (item, file) => {
    if (!file) return;
    setUploadingId(item.id);
    setError("");
    setNotice("");
    try {
      const form = new FormData();
      form.append("image", file);
      const res = await fetch(`/api/items/${item.id}/photo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("hostelbarter_token")}`,
        },
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Photo upload failed.");
      setNotice(`Photo uploaded for “${item.title}”.`);
      await fetchItems();
    } catch (err) {
      setError(err.message || "Photo could not be uploaded.");
    } finally {
      setUploadingId(null);
    }
  };

  const startEdit = (item) => {
    setError("");
    setNotice("");
    setEditingId(item.id);
    setEditForm({
      title: item.title || "",
      description: item.description || "",
      category: item.category || "Other",
      looking_for: item.looking_for || "",
    });
  };

  const saveEdit = async (item) => {
    setSavingEdit(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("hostelbarter_token")}`,
        },
        body: JSON.stringify({
          title: editForm.title.trim(),
          description: editForm.description.trim(),
          category: editForm.category,
          looking_for: editForm.looking_for.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Listing could not be updated.");
      setEditingId(null);
      setNotice(`“${editForm.title.trim()}” was updated.`);
      await fetchItems();
    } catch (err) {
      setError(err.message || "Listing could not be updated. Please try again.");
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteItem = async (item) => {
    if (!confirm(`Delete “${item.title}”? It will be removed from the marketplace, its photo will be deleted, and any pending proposals for it will be cancelled.`)) return;
    setDeletingId(item.id);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("hostelbarter_token")}`,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Listing could not be deleted.");
      // Remove it from the page immediately, then confirm with the server.
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setNotice(`“${item.title}” was deleted.`);
      await fetchItems();
    } catch (err) {
      setError(err.message || "Listing could not be deleted. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">My Listings</h1>
          <p className="text-gray-500 mt-1">
            {items.length} item{items.length !== 1 ? "s" : ""} listed
          </p>
        </div>
      </div>

      {error && <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-red-700">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-emerald-800">{notice}</p>}
      <IncomingOffers onChange={fetchItems} />
      {items.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">
            No listings yet
          </h3>
          <p className="text-gray-500 mb-4">
            Start by posting an item to barter or share!
          </p>
          <a href="/post-item" className="btn-primary inline-block">
            + Post Your First Item
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="card p-4 flex gap-4 items-start">
              {/* Thumbnail */}
              <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
                {item.image_url ? (
                  <ListingPhoto src={item.image_url} title={item.title} />
                ) : (
                  <span className="text-2xl">
                    {categoryIcons[item.category] || "📦"}
                  </span>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-gray-900">{item.title}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {item.category} · Looking for: {item.looking_for}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 ${
                      item.status === "available"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {item.status === "available"
                      ? "✅ Available"
                      : "🔄 Bartered"}
                  </span>
                </div>
                {!item.image_url && (
                  <div className={`mt-3 rounded-xl px-3 py-2.5 ${item.photo_removed_by_admin ? "bg-amber-50 border border-amber-200" : "bg-gray-50 border border-gray-200"}`}>
                    <p className={`text-xs ${item.photo_removed_by_admin ? "text-amber-800" : "text-gray-600"}`}>
                      {item.photo_removed_by_admin
                        ? "An admin removed this listing's photo. Please upload an appropriate photo again."
                        : "This listing has no photo yet."}
                    </p>
                    <label className="btn-secondary mt-2 inline-flex cursor-pointer text-xs px-3 py-1.5">
                      {uploadingId === item.id ? "Uploading…" : "📷 Upload photo"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="hidden"
                        disabled={uploadingId !== null}
                        onChange={(e) => {
                          uploadPhoto(item, e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  {item.status === "available" ? (
                    <button
                      onClick={() => markAsBartered(item.id)}
                      className="text-xs bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-amber-200 transition-colors"
                    >
                      Mark as Bartered
                    </button>
                  ) : (
                    <button
                      onClick={() => markAsAvailable(item.id)}
                      className="text-xs bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-green-200 transition-colors"
                    >
                      Mark Available
                    </button>
                  )}
                  <button
                    onClick={() => (editingId === item.id ? setEditingId(null) : startEdit(item))}
                    className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-indigo-100 transition-colors"
                  >
                    ✏️ Edit
                  </button>
                  {item.image_url && (
                    <label className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-100 transition-colors cursor-pointer">
                      {uploadingId === item.id ? "Uploading…" : "🖼️ Update photo"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="hidden"
                        disabled={uploadingId !== null}
                        onChange={(e) => {
                          uploadPhoto(item, e.target.files?.[0]);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                  <button
                    onClick={() => deleteItem(item)}
                    disabled={deletingId !== null}
                    className="text-xs bg-red-50 text-red-600 px-3 py-1.5 rounded-lg font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    {deletingId === item.id ? "Deleting…" : "Delete"}
                  </button>
                </div>
                {editingId === item.id && (
                  <form
                    className="mt-4 space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3"
                    onSubmit={(e) => { e.preventDefault(); saveEdit(item); }}
                  >
                    <div>
                      <label htmlFor={`edit-title-${item.id}`} className="block text-xs font-semibold text-gray-700 mb-1">Title</label>
                      <input id={`edit-title-${item.id}`} className="input-field py-2" value={editForm.title} maxLength={255}
                        onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} required />
                    </div>
                    <div>
                      <label htmlFor={`edit-category-${item.id}`} className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
                      <select id={`edit-category-${item.id}`} className="input-field py-2" value={editForm.category}
                        onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}>
                        {CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`edit-description-${item.id}`} className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
                      <textarea id={`edit-description-${item.id}`} className="input-field py-2" rows={3} value={editForm.description}
                        onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} required />
                    </div>
                    <div>
                      <label htmlFor={`edit-looking-${item.id}`} className="block text-xs font-semibold text-gray-700 mb-1">Looking for</label>
                      <input id={`edit-looking-${item.id}`} className="input-field py-2" value={editForm.looking_for} maxLength={255}
                        onChange={(e) => setEditForm((f) => ({ ...f, looking_for: e.target.value }))} required />
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={savingEdit} className="btn-primary text-xs px-3 py-1.5">
                        {savingEdit ? "Saving…" : "Save changes"}
                      </button>
                      <button type="button" onClick={() => setEditingId(null)} className="btn-secondary text-xs px-3 py-1.5">
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyListings;
