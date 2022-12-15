const taskService = require('./task.service.js')

const logger = require('../../services/logger.service')
var isWorkerOn = false

async function getTasks(req, res) {
  try {
    logger.debug('Getting Tasks')
    const filterBy = {
      txt: req.query.txt || '',
      maxTries: req.query.maxTries || Infinity,
      status: req.query.status || ''
    }
    const tasks = await taskService.query(filterBy)
    res.json(tasks)
  } catch (err) {
    logger.error('Failed to get tasks', err)
    res.status(500).send({ err: 'Failed to get tasks' })
  }
}

async function getTaskById(req, res) {
  try {
    const taskId = req.params.id
    const task = await taskService.getById(taskId)
    res.json(task)
  } catch (err) {
    logger.error('Failed to get task', err)
    res.status(500).send({ err: 'Failed to get task' })
  }
}

async function addTask(req, res) {
  const { loggedinUser } = req

  try {
    const task = req.body
    task.owner = loggedinUser
    const addedTask = await taskService.add(task)
    res.json(addedTask)
  } catch (err) {
    logger.error('Failed to add task', err)
    res.status(500).send({ err: 'Failed to add task' })
  }
}


async function updateTask(req, res) {
  try {
    const task = req.body
    const updatedTask = await taskService.update(task)
    res.json(updatedTask)
  } catch (err) {
    logger.error('Failed to update task', err)
    res.status(500).send({ err: 'Failed to update task' })

  }
}

async function removeTask(req, res) {
  try {
    const taskId = req.params.id
    const removedId = await taskService.remove(taskId)
    res.send(removedId)
  } catch (err) {
    logger.error('Failed to remove task', err)
    res.status(500).send({ err: 'Failed to remove task' })
  }
}

async function addTaskMsg(req, res) {
  const { loggedinUser } = req
  try {
    const taskId = req.params.id
    const msg = {
      txt: req.body.txt,
      by: loggedinUser
    }
    const savedMsg = await taskService.addTaskMsg(taskId, msg)
    res.json(savedMsg)
  } catch (err) {
    logger.error('Failed to update task', err)
    res.status(500).send({ err: 'Failed to update task' })

  }
}

async function removeTaskMsg(req, res) {
  const { loggedinUser } = req
  try {
    const taskId = req.params.id
    const { msgId } = req.params

    const removedId = await taskService.removeTaskMsg(taskId, msgId)
    res.send(removedId)
  } catch (err) {
    logger.error('Failed to remove task msg', err)
    res.status(500).send({ err: 'Failed to remove task msg' })

  }
}

async function performTask(req, res) {
  try {
    const taskId = req.params.id
    const updatedTask = await taskService.perform(taskId)

    res.json(updatedTask)
  } catch (err) {
    logger.error('Failed to perform task', err)
    res.status(500).send({ err: 'Failed to perform task' })
  }
}


function callWorker(req, res) {
  const action = req.params.action
  isWorkerOn = (action === 'start') ? true : false
  if (isWorkerOn) runWorker()
}

async function runWorker() {
  if (!isWorkerOn) return
  var delay = 5000
  try {
    const task = await taskService.getNextTask()
    if (task) {
      try {
        const performedTask = await taskService.perform(task._id)
      } catch (err) {
        console.log(`Failed Task`, err)
      } finally {
        delay = 1
      }
    } else {
      console.log('Snoozing... no tasks to perform')
    }
  } catch (err) {
    console.log(`Failed getting next task to execute`, err)
  } finally {
    setTimeout(runWorker, delay)
  }
}

module.exports = {
  getTasks,
  getTaskById,
  addTask,
  updateTask,
  removeTask,
  addTaskMsg,
  removeTaskMsg,
  performTask,
  callWorker,
}
