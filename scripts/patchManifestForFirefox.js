#!/usr/bin/env node

const fs = require("fs")

const filePaths = process.argv.filter((path) => /.json$/i.test(path))

filePaths.forEach((path) => {
	const obj = JSON.parse(fs.readFileSync(path))

	obj.background = {
		scripts: [obj.background.service_worker],
	}

	console.log("Patching MV3 for Firefox:", path)
	fs.writeFileSync(path, JSON.stringify(obj, null, 2))
})
