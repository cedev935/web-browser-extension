#!/usr/bin/env node

const fs = require("fs")

const filePaths = process.argv.filter((path) => /.json$/i.test(path))

filePaths.forEach((path) => {
	const obj = JSON.parse(fs.readFileSync(path))

	// set to version 2
	obj.manifest_version = 2

	// revert `service_worker` into `background`
	obj.background = {
		scripts: [obj.background.service_worker],
	}

	// revert `browser_action` into `action`
	obj.browser_action = obj.action
	delete obj.action

	// add back `web_accessible_resources`
	obj.web_accessible_resources = ["assets/*"]

	// revert `host_permissions` into `permissions`
	obj.permissions.push(...obj.host_permissions)
	delete obj.host_permissions

	fs.writeFileSync(path, JSON.stringify(obj, null, 2))
})
