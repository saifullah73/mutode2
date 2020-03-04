const walk = require('babylon-walk')
const chalk = require('chalk')
const debug = require('debug')('mutode:removeLinesMutator')

const mutantRunner = require('../mutantRunner')

/**
 * @description Mutator that comments single line statements
 * @function removeLinesMutator
 * @memberOf module:Mutators
 */
module.exports = async function removeLinesMutator ({ mutodeInstance, filePath, lines, queue, ast }) {
  debug('Running remove lines mutator on %s', filePath)

  const linesCheck = {}

  walk.simple(ast, {
    Statement (node) {
      if (node.loc.start.line !== node.loc.end.line) {
        debug('Multi line statement, continuing')
        return
      }
      if (linesCheck[node.loc.start.line]) {
        debug('Already checked line, continuing')
        return
      }
      const line = node.loc.start.line
      const lineContent = lines[line - 1]

      linesCheck[line] = true

      if (lineContent.trim().startsWith('console.') || lineContent.trim().startsWith('debug(')) {
        debug('Logging line, continuing')
        return
      }
      if (/^module.exports.?=/.test(lineContent) || /^exports.?=/.test(lineContent)) {
        debug('Exports line, continuing')
        return
      }
      if (lineContent.trim().endsWith('{')) {
        debug('Code block line, continuing')
        return
      }

      const mutantId = ++mutodeInstance.mutants
      const log = `MUTANT ${mutantId}:\tRLM Commented line ${line}:\t${chalk.inverse(lineContent.trim())}`
      debug(log)
      mutodeInstance.mutantLog(log)
      const linesCopy = lines.slice()
      linesCopy[line - 1] = `// ${lineContent}`
      const contentToWrite = linesCopy.join('\n')
      queue.push(mutantRunner({ mutodeInstance, filePath, contentToWrite, log }))
    }
  })
}
