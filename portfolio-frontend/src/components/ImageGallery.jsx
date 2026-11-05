import { useEffect, useRef, useState } from 'react'

function getImageSource(image) {
  if (typeof image === 'string') return image
  return image?.url || image?.src || image?.image || ''
}

function getImageAlt(image, index) {
  if (typeof image === 'string') return `Project image ${index + 1}`
  return image?.alt || image?.caption || `Project image ${index + 1}`
}

export function ImageGallery({ images, coverImage, projectTitle }) {
  const [activeIndex, setActiveIndex] = useState(null)
  const dialogRef = useRef(null)
  const viewerImages = coverImage ? [coverImage, ...images] : images

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog || activeIndex === null) return undefined

    if (!dialog.open) dialog.showModal()
    const handleKeys = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        dialog.close()
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        setActiveIndex((index) => (index + 1) % viewerImages.length)
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setActiveIndex((index) => (index - 1 + viewerImages.length) % viewerImages.length)
      }
    }
    window.addEventListener('keydown', handleKeys)
    return () => window.removeEventListener('keydown', handleKeys)
  }, [activeIndex, viewerImages.length])

  const closeDialog = () => dialogRef.current?.close()
  const activeImage = activeIndex === null ? null : viewerImages[activeIndex]

  return (
    <>
      {coverImage && <figure className="detail-cover-figure">
        <button className="detail-cover-button" type="button" onClick={() => setActiveIndex(0)} aria-label={`Open cover image: ${getImageAlt(coverImage, 0)}`}>
          <img className="detail-cover" src={getImageSource(coverImage)} alt={getImageAlt(coverImage, 0)} />
          <span className="gallery-zoom-hint" aria-hidden="true">View cover image ↗</span>
        </button>
        {coverImage.caption && <figcaption>{coverImage.caption}</figcaption>}
      </figure>}
      <div className="image-gallery" aria-label={`${projectTitle} image gallery`}>
        {images.map((image, index) => {
          const viewerIndex = index + (coverImage ? 1 : 0)
          return (
          <figure className="gallery-item" key={`${getImageSource(image)}-${index}`}>
            <button className="gallery-image-button" type="button" onClick={() => setActiveIndex(viewerIndex)}
              aria-label={`Open image ${viewerIndex + 1} of ${viewerImages.length}: ${getImageAlt(image, viewerIndex)}`}>
              <img src={getImageSource(image)} alt={getImageAlt(image, index)} />
              <span className="gallery-zoom-hint" aria-hidden="true">View image ↗</span>
            </button>
            {image?.caption && <figcaption>{image.caption}</figcaption>}
          </figure>
          )
        })}
      </div>

      <dialog className="image-lightbox" ref={dialogRef} aria-label={`${projectTitle} image viewer`}
        onClose={() => setActiveIndex(null)} onClick={(event) => {
          if (event.target === dialogRef.current) closeDialog()
        }}>
        {activeImage && <>
          <div className="lightbox-toolbar">
            <p>{projectTitle} <span>— {activeIndex + 1} / {viewerImages.length}</span></p>
            <button className="lightbox-close" type="button" onClick={closeDialog} autoFocus aria-label="Close image viewer">Close <span aria-hidden="true">×</span></button>
          </div>
          <button className="lightbox-arrow lightbox-previous" type="button" aria-label="Previous image"
            onClick={() => setActiveIndex((index) => (index - 1 + viewerImages.length) % viewerImages.length)}>←</button>
          <figure className="lightbox-figure">
            <img src={getImageSource(activeImage)} alt={getImageAlt(activeImage, activeIndex)} />
            {activeImage?.caption && <figcaption>{activeImage.caption}</figcaption>}
          </figure>
          <button className="lightbox-arrow lightbox-next" type="button" aria-label="Next image"
            onClick={() => setActiveIndex((index) => (index + 1) % viewerImages.length)}>→</button>
        </>}
      </dialog>
    </>
  )
}
