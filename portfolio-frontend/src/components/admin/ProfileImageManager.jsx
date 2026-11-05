import { useRef, useState } from 'react'
import { useProfileImage } from '../../context/useProfileImage.js'
import { adminService } from '../../services/adminService.js'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const ALLOWED_EXTENSION = /\.(png|jpe?g|webp)$/i

export function ProfileImageManager() {
  const inputRef = useRef(null)
  const { profileImage, setProfileImage } = useProfileImage()
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')

  function updateCrop(key, value) {
    setProfileImage((current) => current ? { ...current, [key]: Number(value) } : current)
    setFeedback('')
  }

  function onFileChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    setError('')
    setFeedback('')
    if (!file) return
    if (!ALLOWED_TYPES.has(file.type) || !ALLOWED_EXTENSION.test(file.name)) {
      setError('Choose a PNG, JPG, JPEG, or WebP image.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('The image must be 5 MB or smaller.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setError('This image could not be previewed. Please choose another file.')
        return
      }
      const image = new Image()
      image.onload = () => {
        setProfileImage({
          src: reader.result,
          alt: 'Anime-style profile portrait of Levi Blaque',
          positionX: 50,
          positionY: 12,
          zoom: 1,
        })
        setFeedback('Image preview updated across the public portfolio for this session. It has not been saved.')
      }
      image.onerror = () => setError('This image could not be opened. Please choose a valid image file.')
      image.src = reader.result
    }
    reader.onerror = () => setError('This image could not be read. Please try again.')
    reader.readAsDataURL(file)
  }

  async function saveImage() {
    setError('')
    setFeedback('')
    try {
      await adminService.saveProfileImage(profileImage)
      setFeedback('Profile image saved.')
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  return (
    <section className="profile-image-manager" aria-labelledby="profile-image-title">
      <div className="profile-image-manager__heading">
        <p className="eyebrow">Profile media / 01</p>
        <h2 id="profile-image-title">Profile image</h2>
        <p>One shared portrait appears on the homepage and About page. Image changes preview in this session only.</p>
      </div>
      <div className="profile-image-manager__content">
        <div className="profile-image-manager__preview-wrap">
          <div className="profile-image-manager__preview" aria-label="Current profile image preview">
            {profileImage?.src
              ? <img className="profile-image-manager__image" src={profileImage.src} alt={profileImage.alt} style={{ objectPosition: `${profileImage.positionX}% ${profileImage.positionY}%`, transform: `scale(${profileImage.zoom})` }} />
              : <span className="profile-image-manager__empty">No profile image selected</span>}
          </div>
          <div className="profile-image-manager__actions">
            <input ref={inputRef} id="profile-image-input" className="visually-hidden" type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" onChange={onFileChange} aria-label="Choose profile image" />
            <button className="admin-button admin-button--primary" type="button" onClick={() => inputRef.current?.click()}>{profileImage?.src ? 'Replace Image' : 'Upload Image'}</button>
            {profileImage?.src && <button className="admin-button" type="button" onClick={() => { setProfileImage(null); setError(''); setFeedback('Portrait removed from the session preview. This change has not been saved.') }}>Remove Image</button>}
          </div>
          <p className="admin-help-text">PNG, JPG/JPEG or WebP · up to 5 MB</p>
        </div>
        <div className="profile-image-manager__controls">
          <h3>Position and crop</h3>
          <p>Adjust the crop without changing the illustration itself.</p>
          {profileImage?.src ? <>
            <label className="profile-crop-control">Horizontal position <output>{profileImage.positionX}%</output><input type="range" min="0" max="100" value={profileImage.positionX} onChange={(event) => updateCrop('positionX', event.target.value)} /></label>
            <label className="profile-crop-control">Vertical position <output>{profileImage.positionY}%</output><input type="range" min="0" max="100" value={profileImage.positionY} onChange={(event) => updateCrop('positionY', event.target.value)} /></label>
            <label className="profile-crop-control">Zoom <output>{Number(profileImage.zoom).toFixed(2)}×</output><input type="range" min="1" max="2" step="0.05" value={profileImage.zoom} onChange={(event) => updateCrop('zoom', event.target.value)} /></label>
          </> : <p className="admin-help-text">Upload an image to adjust its crop.</p>}
          <p className="profile-image-manager__notice">Permanent image storage is unavailable until the backend is connected.</p>
          {error && <p className="admin-feedback admin-feedback--error" role="alert">{error}</p>}
          {feedback && <p className="admin-feedback" role="status">{feedback}</p>}
          <button className="admin-button admin-button--primary" type="button" onClick={saveImage}>Save Changes</button>
        </div>
      </div>
    </section>
  )
}
