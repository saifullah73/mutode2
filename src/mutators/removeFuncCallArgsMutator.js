const walk = require('babylon-walk')
const debug = require('debug')('mutode:removeFuncCallArgsMutator')

const mutantRunner = require('../mutantRunner')
const lineDiff = require('../util/lineDiff')

/**
 * @description Mutates function calls removing single arguments.
 * @function removeFuncCallArgsMutator
 * @memberOf module:Mutators
 */
module.exports = async function removeFuncCallArgsMutator ({ mutodeInstance, filePath, lines, queue, ast }) {
  debug('Running remove function call arguments mutator on %s', filePath)

  walk.ancestor(ast, {
    CallExpression (functionNode, state, ancestors) {
      if (ancestors.length >= 2) {
        const ancestor = ancestors[ancestors.length - 2]
        if (ancestor.type && ancestor.type === 'CallExpression' && ancestor.callee) {
          if (ancestor.callee.type === 'MemberExpression' && ancestor.callee.object.name === 'console') return
          if (ancestor.callee.name) {
            switch (ancestor.callee.name) {
              case 'require':
              case 'debug':
                return
              default:
                break
            }
          }
        }
      }

      for (const node of functionNode.arguments) {
        const line = node.loc.start.line
        const lineContent = lines[line - 1]

        let trimmed = false
        let start = lineContent.substr(0, node.loc.start.column)
        if (start.trim().endsWith(',')) {
          start = start.substr(0, start.lastIndexOf(','))
          trimmed = true
        }
        let end = lineContent.substr(node.loc.end.column)
        if (!trimmed && end.startsWith(',')) end = end.substr(1).trim()
        const mutantLineContent = start + end

        const mutantId = ++mutodeInstance.mutants
        const diff = lineDiff(lineContent, mutantLineContent)
        const log = `MUTANT ${mutantId}:\tRFCAM Line ${line}:\t${diff}`
        debug(log)
        mutodeInstance.mutantLog(`MUTANT ${mutantId}:\tRFCAM ${filePath} Line ${line}:\t\`${lineContent.trim()}\` > \`${mutantLineContent.trim()}'\``)
        const linesCopy = lines.slice()
        linesCopy[line - 1] = mutantLineContent
        const contentToWrite = linesCopy.join('\n')
        queue.push(mutantRunner({ mutodeInstance, filePath, contentToWrite, log }))
      }
    }
  })
}
