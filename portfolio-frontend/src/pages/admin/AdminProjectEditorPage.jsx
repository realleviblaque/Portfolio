import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AdminFeedback, AdminField, AdminPageHeading } from '../../components/admin/AdminComponents.jsx'
import { adminService } from '../../services/adminService.js'

const initialValues = {
  title: '', shortDescription: '', category: '', status: '', publicationStatus: '',
  startDate: '', endDate: '', liveUrl: '', repositoryUrl: '', coverFile: null,
  coverPreview: '', description: '', technologies: '', gallery: [],
}

export function AdminProjectEditorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(id)
  const [values, setValues] = useState(initialValues)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(editing)

  useEffect(() => {
    if (!editing) return undefined
    let active = true
    Promise.resolve().then(() => adminService.getProject(id)).then((project) => {
      if (active && project) setValues({ ...initialValues, ...project })
    }).catch((loadError) => {
      if (active) setError(loadError.message)
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [editing, id])

  function update(key, value) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function readImage(file, callback) {
    if (!file) return callback(null, '')
    const reader = new FileReader()
    reader.onload = () => callback(file, reader.result)
    reader.onerror = () => setError('This image could not be previewed in the browser.')
    reader.readAsDataURL(file)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    try {
      if (editing) await adminService.updateProject(id, values)
      else await adminService.createProject(values)
      navigate('/admin/projects')
    } catch (saveError) {
      setError(saveError.message)
    }
  }

  function addGalleryImage() {
    setValues((current) => ({ ...current, gallery: [...current.gallery, { id: `${Date.now()}-${current.gallery.length}`, file: null, preview: '', caption: '' }] }))
  }

  function updateGalleryItem(idToUpdate, updates) {
    setValues((current) => ({ ...current, gallery: current.gallery.map((item) => item.id === idToUpdate ? { ...item, ...updates } : item) }))
  }

  return (
    <>
      <AdminPageHeading eyebrow={`Projects / ${editing ? 'Edit' : 'New'}`} title={editing ? 'Edit project' : 'Add project'} description={editing ? `Project record: ${id}` : 'Enter project details. Draft and publication states are managed separately.'}
        action={<Link className="admin-button" to="/admin/projects">Back to projects</Link>} />
      {loading && <p className="admin-inline-note">Loading project details…</p>}
      <AdminFeedback>{error}</AdminFeedback>
      <form className="admin-form" onSubmit={handleSubmit}>
        <section className="admin-form-section"><div className="admin-form-section-heading"><span>01</span><div><h2>Project identity</h2><p>Public title, summary, category, and progress.</p></div></div>
          <div className="admin-form-grid">
            <AdminField label="Project title" name="project-title" required value={values.title} onChange={(event) => update('title', event.target.value)} />
            <AdminField label="Category" name="project-category" value={values.category} onChange={(event) => update('category', event.target.value)} />
            <AdminField as="textarea" label="Short description" name="project-short-description" rows="3" required value={values.shortDescription} onChange={(event) => update('shortDescription', event.target.value)} />
            <AdminField as="textarea" label="Full description" name="project-description" rows="6" value={values.description} onChange={(event) => update('description', event.target.value)} />
            <AdminField as="select" label="Progress status" name="project-progress" required value={values.status} onChange={(event) => update('status', event.target.value)}><option value="" disabled>Select progress</option><option>Ongoing</option><option>Completed</option><option>Paused</option></AdminField>
            <AdminField as="select" label="Publication status" name="project-publication" required value={values.publicationStatus} onChange={(event) => update('publicationStatus', event.target.value)}><option value="" disabled>Select publication</option><option value="draft">Draft</option><option value="published">Published</option></AdminField>
          </div>
        </section>
        <section className="admin-form-section"><div className="admin-form-section-heading"><span>02</span><div><h2>Timeline and links</h2><p>Optional completion date and project destinations.</p></div></div>
          <div className="admin-form-grid admin-form-grid--two">
            <AdminField label="Start date" name="project-start" type="date" value={values.startDate} onChange={(event) => update('startDate', event.target.value)} />
            <AdminField label="Completion date" name="project-end" type="date" value={values.endDate} onChange={(event) => update('endDate', event.target.value)} />
            <AdminField label="Live website URL" name="project-live-url" type="url" value={values.liveUrl} onChange={(event) => update('liveUrl', event.target.value)} />
            <AdminField label="Repository URL" name="project-repository-url" type="url" value={values.repositoryUrl} onChange={(event) => update('repositoryUrl', event.target.value)} />
            <AdminField label="Technologies" name="project-technologies" hint="Separate each item with a comma." value={values.technologies} onChange={(event) => update('technologies', event.target.value)} />
          </div>
        </section>
        <section className="admin-form-section"><div className="admin-form-section-heading"><span>03</span><div><h2>Cover image</h2><p>The cover is kept separate from gallery images. Preview is local to this form.</p></div></div>
          <div className="admin-image-control">
            <AdminField label="Choose cover image" name="project-cover" type="file" accept="image/*" onChange={(event) => readImage(event.target.files[0], (file, preview) => setValues((current) => ({ ...current, coverFile: file, coverPreview: preview })))} />
            {values.coverPreview && <img className="admin-image-preview" src={values.coverPreview} alt="Selected project cover preview" />}
          </div>
        </section>
        <section className="admin-form-section"><div className="admin-form-section-heading"><span>04</span><div><h2>Gallery</h2><p>Add image blocks with optional captions. Previews are not uploaded or saved yet.</p></div></div>
          <div className="admin-gallery-editor">
            {values.gallery.map((item, index) => <fieldset className="admin-gallery-block" key={item.id}>
              <legend>Gallery image {index + 1}</legend>
              <AdminField label="Choose image" name={`gallery-file-${item.id}`} type="file" accept="image/*" onChange={(event) => readImage(event.target.files[0], (file, preview) => updateGalleryItem(item.id, { file, preview }))} />
              {item.preview && <img className="admin-gallery-preview" src={item.preview} alt={`Gallery image ${index + 1} preview`} />}
              <AdminField label="Image caption (optional)" name={`gallery-caption-${item.id}`} value={item.caption} onChange={(event) => updateGalleryItem(item.id, { caption: event.target.value })} />
              <button className="admin-text-button" type="button" onClick={() => setValues((current) => ({ ...current, gallery: current.gallery.filter((image) => image.id !== item.id) }))}>Remove image</button>
            </fieldset>)}
            <button className="admin-button" type="button" onClick={addGalleryImage}>Add gallery image <span aria-hidden="true">＋</span></button>
          </div>
        </section>
        <div className="admin-form-actions"><button className="admin-button admin-button--primary" type="submit">{editing ? 'Save project' : 'Create project'}</button><Link className="admin-button" to="/admin/projects">Cancel</Link><p>Saving requires the project backend. This form will not claim success while it is disconnected.</p></div>
      </form>
    </>
  )
}
