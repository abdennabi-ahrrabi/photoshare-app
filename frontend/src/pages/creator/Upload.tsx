import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { photosApi } from '../../services/api';
import './Upload.css';

export function Upload() {
  const navigate = useNavigate();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [tags, setTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file) {
      setError('Please select an image');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('title', title);
      if (caption) formData.append('caption', caption);
      if (location) formData.append('location', location);
      if (tags) {
        const tagList = tags.split(',').map((t) => t.trim()).filter((t) => t);
        formData.append('tags', JSON.stringify(tagList));
      }

      await photosApi.upload(formData);
      navigate('/my-photos');
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Upload failed';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="upload-page">
      <h1>Upload Photo</h1>

      {error && <div className="upload-error">{error}</div>}

      <form onSubmit={handleSubmit} className="upload-form">
        <div className="upload-section">
          <div className="file-upload">
            {preview ? (
              <div className="preview-container">
                <img src={preview} alt="Preview" className="preview-image" />
                <button type="button" onClick={() => { setFile(null); setPreview(null); }}>
                  Remove
                </button>
              </div>
            ) : (
              <label className="file-input-label">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  required
                />
                <span>Click to select an image</span>
                <span className="file-types">JPEG, PNG, GIF, WebP (max 10MB)</span>
              </label>
            )}
          </div>

          <div className="form-fields">
            <div className="form-group">
              <label htmlFor="title">Title *</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Give your photo a title"
              />
            </div>

            <div className="form-group">
              <label htmlFor="caption">Caption</label>
              <textarea
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Describe your photo..."
                rows={3}
              />
            </div>

            <div className="form-group">
              <label htmlFor="location">Location</label>
              <input
                id="location"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Where was this taken?"
              />
            </div>

            <div className="form-group">
              <label htmlFor="tags">People Tagged</label>
              <input
                id="tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Comma-separated names (e.g. John, Jane)"
              />
            </div>
          </div>
        </div>

        <div className="upload-actions">
          <button type="button" onClick={() => navigate('/my-photos')} className="cancel-btn">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting || !file}>
            {isSubmitting ? 'Uploading...' : 'Upload Photo'}
          </button>
        </div>
      </form>
    </div>
  );
}
