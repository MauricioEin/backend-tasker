function execute(task) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() > 0.5) resolve(parseInt(Math.random() * 100))
      else {
        const errors = ['High Temparture', 'Low Temparture', 'Lack of Food', 'Lack of Love', 'Lack of Luck', 'Didn\'t feel like it', 'Bad Mood', 'Overload']
        reject(errors[Math.floor(Math.random() * errors.length)])
      }
    }, 500)
  })
}


module.exports = {
  execute
}
