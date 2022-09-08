#!/usr/bin/env node

const fs = require("fs")

const assign = (target, source) =>
	Object.entries(source).reduce((result, [key, value]) => {
		result[key] = value instanceof Object ? assign(result[key] ?? (Array.isArray(value) ? [] : {}), value) : value
		return result
	}, target)

const filePaths = process.argv.filter((path) => /.json$/i.test(path))

const resultObj = filePaths.reduce((combinedObj, filePath) => {
	const obj = JSON.parse(fs.readFileSync(filePath))
	return assign(combinedObj, obj)
}, {})

console.log(JSON.stringify(resultObj, null, 2))
