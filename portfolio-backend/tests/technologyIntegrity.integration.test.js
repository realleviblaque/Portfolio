import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import Project from '../src/models/Project.js'
import Technology from '../src/models/Technology.js'
import { createProjectService } from '../src/services/projectService.js'
import { createTechnologyService } from '../src/services/technologyService.js'

const testUri = process.env.MONGODB_REPLICA_SET_TEST_URI
if (testUri) {
  const parsed = new URL(testUri)
  if (!['127.0.0.1', 'localhost', '::1'].includes(parsed.hostname)
    || parsed.pathname !== '/portfolio_phase6_integrity_test') {
    throw new Error('MONGODB_REPLICA_SET_TEST_URI must target localhost/portfolio_phase6_integrity_test only.')
  }
}

describe('technology integrity on a MongoDB replica set', { skip: !testUri }, () => {
  let projects
  let technologies

  before(async () => {
    await mongoose.connect(testUri)
    await mongoose.connection.dropDatabase()
    await Promise.all([Project.init(), Technology.init()])
    projects = createProjectService({ ProjectModel: Project, TechnologyModel: Technology })
    technologies = createTechnologyService({ ProjectModel: Project, TechnologyModel: Technology })
  })

  after(async () => {
    if (mongoose.connection.readyState) {
      await mongoose.connection.dropDatabase()
      await mongoose.disconnect()
    }
  })

  it('enforces normalized-name uniqueness through the MongoDB index', async () => {
    await Technology.create({ name: 'React JS', slug: 'react-js' })
    await assert.rejects(Technology.create({ name: '  REACT   js ', slug: 'react-js-alt' }), (error) => error?.code === 11000)
  })

  it('translates concurrent duplicate creation into one success and a 409 conflict', async () => {
    const results = await Promise.allSettled([
      technologies.createTechnology({ name: 'Concurrent Name', slug: 'concurrent-name-a' }),
      technologies.createTechnology({ name: ' concurrent   name ', slug: 'concurrent-name-b' }),
    ])
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1)
    const rejected = results.find((result) => result.status === 'rejected')
    assert.equal(rejected.reason.status, 409)
    assert.equal(rejected.reason.code, 'DUPLICATE_TECHNOLOGY')
    assert.equal(await Technology.countDocuments({ normalizedName: 'concurrent name' }), 1)
  })

  it('deletes an unreferenced technology and refuses a referenced one', async () => {
    const unused = await Technology.create({ name: 'Unused', slug: 'unused' })
    assert.deepEqual(await technologies.deleteTechnology(unused._id), { id: String(unused._id), deleted: true })

    const used = await Technology.create({ name: 'Used', slug: 'used' })
    await Project.create({ title: 'Using project', slug: 'using-project', shortDescription: 'Test', technologies: [used._id] })
    await assert.rejects(technologies.deleteTechnology(used._id), (error) => error?.code === 'TECHNOLOGY_IN_USE')
    assert.ok(await Technology.findById(used._id))
  })

  it('serializes concurrent technology assignment and deletion without dangling references', async () => {
    const technology = await Technology.create({ name: 'Concurrent', slug: 'concurrent' })
    const original = Technology.findOneAndUpdate
    let lockCalls = 0
    let releaseBarrier
    const barrier = new Promise((resolve) => { releaseBarrier = resolve })
    Technology.findOneAndUpdate = function gatedFindOneAndUpdate(...args) {
      const query = original.apply(this, args)
      if (args[1]?.$inc?.__v === undefined || lockCalls >= 2) return query
      lockCalls += 1
      if (lockCalls === 2) releaseBarrier()
      return barrier.then(() => query)
    }

    let assignmentResult
    let deletionResult
    try {
      ;[assignmentResult, deletionResult] = await Promise.allSettled([
        projects.createProject({ title: 'Concurrent assignment', shortDescription: 'Test', technologies: [String(technology._id)] }),
        technologies.deleteTechnology(technology._id),
      ])
    } finally {
      Technology.findOneAndUpdate = original
    }

    assert.ok(lockCalls >= 2, 'both operations must contend on the shared technology document')
    const savedProject = await Project.findOne({ slug: 'concurrent-assignment' })
    const savedTechnology = await Technology.findById(technology._id)
    const referencesDeletedTechnology = savedProject?.technologies.some((id) => String(id) === String(technology._id)) && !savedTechnology
    assert.equal(Boolean(referencesDeletedTechnology), false, 'a project must never reference a deleted technology')
    if (savedProject?.technologies.some((id) => String(id) === String(technology._id))) {
      assert.equal(assignmentResult.status, 'fulfilled')
      assert.equal(deletionResult.status, 'rejected')
      assert.equal(deletionResult.reason.code, 'TECHNOLOGY_IN_USE')
    } else {
      assert.equal(deletionResult.status, 'fulfilled')
      assert.equal(assignmentResult.status, 'rejected')
    }
  })

  it('serializes concurrent project update assignment and technology deletion', async () => {
    const technology = await Technology.create({ name: 'Update race', slug: 'update-race' })
    const project = await Project.create({ title: 'Existing project', slug: 'existing-project', shortDescription: 'Test' })
    const original = Technology.findOneAndUpdate
    let lockCalls = 0
    let releaseBarrier
    const barrier = new Promise((resolve) => { releaseBarrier = resolve })
    Technology.findOneAndUpdate = function gatedFindOneAndUpdate(...args) {
      const query = original.apply(this, args)
      if (args[1]?.$inc?.__v === undefined || lockCalls >= 2) return query
      lockCalls += 1
      if (lockCalls === 2) releaseBarrier()
      return barrier.then(() => query)
    }

    let assignmentResult
    let deletionResult
    try {
      ;[assignmentResult, deletionResult] = await Promise.allSettled([
        projects.updateProject(project._id, { technologies: [String(technology._id)] }),
        technologies.deleteTechnology(technology._id),
      ])
    } finally {
      Technology.findOneAndUpdate = original
    }

    assert.ok(lockCalls >= 2, 'both operations must contend on the shared technology document')
    const savedProject = await Project.findById(project._id)
    const savedTechnology = await Technology.findById(technology._id)
    const referencesDeletedTechnology = savedProject.technologies.some((id) => String(id) === String(technology._id)) && !savedTechnology
    assert.equal(Boolean(referencesDeletedTechnology), false, 'a project must never reference a deleted technology')
    if (savedProject.technologies.some((id) => String(id) === String(technology._id))) {
      assert.equal(assignmentResult.status, 'fulfilled')
      assert.equal(deletionResult.status, 'rejected')
      assert.equal(deletionResult.reason.code, 'TECHNOLOGY_IN_USE')
    } else {
      assert.equal(deletionResult.status, 'fulfilled')
      assert.equal(assignmentResult.status, 'rejected')
    }
  })
})
