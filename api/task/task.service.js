const dbService = require('../../services/db.service')
const logger = require('../../services/logger.service')
const utilService = require('../../services/util.service')
const externalService = require('../../services/external.service')
const ObjectId = require('mongodb').ObjectId

async function query(filterBy = { txt: '', maxTries: Infinity, status: '' }) {

    try {
        const criteria = {
            title: { $regex: filterBy.txt, $options: 'i' },
            triesCount: { $lte: +filterBy.maxTries }
        }
        if (filterBy.status && filterBy.status !== 'done') {
            logger.debug('got here')
            criteria.status = { $ne: 'done' }
        }
        const collection = await dbService.getCollection('task')
        var tasks = await collection.find(criteria).toArray()
        return tasks
    } catch (err) {
        logger.error('cannot find tasks', err)
        throw err
    }
}

async function getById(taskId) {
    try {
        const collection = await dbService.getCollection('task')
        const task = collection.findOne({ _id: ObjectId(taskId) })
        return task
    } catch (err) {
        logger.error(`while finding task ${taskId}`, err)
        throw err
    }
}


async function remove(taskId) {
    try {
        const collection = await dbService.getCollection('task')
        await collection.deleteOne({ _id: ObjectId(taskId) })
        return taskId
    } catch (err) {
        logger.error(`cannot remove task ${taskId}`, err)
        throw err
    }
}

async function add(task) {
    try {
        task.createdAt = Date.now()
        task.status = 'new'
        task.triesCount = 0
        task.errors = []
        const collection = await dbService.getCollection('task')
        await collection.insertOne(task)
        return task
    } catch (err) {
        logger.error('cannot insert task', err)
        throw err
    }
}

async function update(task) {
    try {
        const taskToSave = {}
        if (task.title) taskToSave.title = task.title
        if (task.status) taskToSave.status = task.status
        if (task.desc) taskToSave.desc = task.desc
        if (task.importance) taskToSave.importance = task.importance
        if (task.createdAt) taskToSave.createdAt = task.createdAt
        if (task.lastTriedAt) taskToSave.lastTriedAt = task.lastTriedAt
        if (task.triesCount) taskToSave.triesCount = task.triesCount
        if (task.doneAt) taskToSave.doneAt = task.doneAt
        if (task.errors) taskToSave.errors = [...task.errors]
        const collection = await dbService.getCollection('task')
        await collection.updateOne({ _id: ObjectId(task._id) }, { $set: taskToSave })
        return task
    } catch (err) {
        logger.error(`cannot update task ${task._id}`, err)
        throw err
    }
}

async function addTaskMsg(taskId, msg) {
    try {
        msg.id = utilService.makeId()
        const collection = await dbService.getCollection('task')
        await collection.updateOne({ _id: ObjectId(taskId) }, { $push: { msgs: msg } })
        return msg
    } catch (err) {
        logger.error(`cannot add task msg ${taskId}`, err)
        throw err
    }
}

async function removeTaskMsg(taskId, msgId) {
    try {
        const collection = await dbService.getCollection('task')
        await collection.updateOne({ _id: ObjectId(taskId) }, { $pull: { msgs: { id: msgId } } })
        return msgId
    } catch (err) {
        logger.error(`cannot add task msg ${taskId}`, err)
        throw err
    }
}

async function perform(taskId) {
    var task = await getById(taskId)
    try {
        task = await update({ ...task, status: 'running' })
        await externalService.execute(task)
        task = await update({ ...task, status: 'done', doneAt: Date.now() })
    } catch (error) {
        try { task = await update({ ...task, status: 'failed', errors: [...task.errors, error] }) }
        catch (err) { throw (err) }
    } finally {
        task = await update({ ...task, lastTriedAt: task.doneAt || Date.now(), triesCount: task.triesCount + 1 })
        return task
    }
}

async function getNextTask() {
    var maxTries = 0
    while (maxTries < 6) {
        const tasks = await query({ txt: '', maxTries, status: "active" })
        if (tasks.length)
            return tasks.sort((task1, task2) => task2.imp - task1.imp)[0]
        maxTries++
    }
}

module.exports = {
    remove,
    query,
    getById,
    add,
    update,
    addTaskMsg,
    removeTaskMsg,
    perform,
    getNextTask,
}
