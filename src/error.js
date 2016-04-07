// Error class for invalid user input.
export function InputError (input, message) {
  this.input = input
  this.message = message
  this.stack = Error().stack
}
InputError.prototype = Object.create(Error.prototype)
InputError.prototype.name = 'InputError'

// Print error message to stderr prefixed with the program name.
function logError (message) {
  console.error(`hourglass: ${message}`)
}

// Generic error handler.
export function handleErrors (err) {
  if (err instanceof InputError) {
    logError(`Invalid input '${err.input}': ${err.message}`)
  } else if (err.code === 'ENOENT') {
    logError(`${err.path}: No such file: ` +
             'Run "hourglass init" to create a new task file.')
  } else if (err.code === 'EEXIST') {
    logError(`${err.path}: File already exists.`)
  } else if (err.code === 'EISDIR') {
    logError(`${err.path} is a directory.`)
  } else if (err.code === 'EACCES' || err.code === 'EPERM') {
    logError(`${err.path}: Permission denied.`)
  } else {
    logError(err.toString())
  }
}
