import fs from 'mz/fs'
import lame from 'lame'
import path from 'path'
import ProgressBar from 'progress'
import readline from 'readline'
import Speaker from 'speaker'

import { parseMilliseconds } from './format'

const beepFile = path.join(__dirname, '../resources/beep.mp3')

// Make Windows emit SIGINT.
if (process.platform === 'win32') {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  rl.on('SIGINT', function () {
    process.emit('SIGINT')
    rl.close()
  })
}

// Return a promise that waits for the given delay in milliseconds,
// displaying the name of a task and a progress bar while waiting.
// If `silent` is `true`, display nothing.
function wait (task, ms, silent = false) {
  console.log('Timer started. Press CTRL-C to cancel.')

  if (silent) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  const delay = 1000

  const bar = new ProgressBar(
    `Task '${task}' -> :elapseds/${parseMilliseconds(ms)} [:bar] :percent`,
    { total: ms / delay, width: 80, incomplete: '.' })

  return new Promise((resolve) => {
    const timer = setInterval(() => {
      bar.tick()
      if (bar.complete) {
        resolve()
        clearInterval(timer)
      }
    }, delay)
  })
}

// Return a promise that plays a beeping sound `nPlays` times, then returns
// the time passed. `nPlays` defaults to -1, which will keep playing
// indefinitely or until SIGINT is received.
function beep (nPlays = -1) {
  return new Promise((resolve, reject) => {
    let i = nPlays - 1

    // Allow for graceful interrupt with CTRL-C.
    process.on('SIGINT', () => {
      // Remove '^C' text from stdout.
      readline.clearLine(process.stdout, -1)
      readline.moveCursor(process.stdout, -2, 0)
      // Set counter to 0 which will stop alarm.
      i = 0
      // Reset CTRL-C to default behavior.
      process.on('SIGINT', process.exit)
    })

    const start = Date.now()

    const play = () => {
      fs.createReadStream(beepFile)
        .on('error', reject)
        .pipe(new lame.Decoder())
        .pipe(new Speaker())
        .on('close', () => {
          // Keep playing sound until counter hits 0.
          if (i--) play()
          else resolve(Date.now() - start)
        })
    }

    play(nPlays)
  })
}

export default { beep, wait }
