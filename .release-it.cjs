
const pkg = require( './package.json' )
pkg.keywords = pkg.keywords.slice(0, 19)
const topics = pkg.keywords.join( ',' )

module.exports = {
	'plugins' : {
		'@release-it/bumper' : {
			'in' : [
				'src/chrome/manifest.json',
				'src/firefox/manifest.json',
			],
			'out' : [
				'src/chrome/manifest.json',
				'src/firefox/manifest.json',
			],
		},
	},
	// 'git' : {
	// 	'requireBranch' : 'main',
	// 	'commitMessage' : ':construction_worker: build(lib): Release v${version}',
	// },
	'hooks' : {
		'before:init'       : [ 'pnpm pes lint-fix' ],
	    'after:bump'        : 'pnpm auto-changelog -p',
	    'after:git:release' : 'echo \'After git push, before github release\'',
		'after:release': [
            `gh repo edit ${pkg.repository.url} -d "${pkg.description}" --add-topic ${topics}`,
            'echo "GitHub action is now releasing: ${name} v${version} to ${repo.repository}.\\n Check if all is ok 🌈🤖\\n https://github.com/${repo.repository}/actions"',
        ],
	},
	'github' : {
		'release' : false,
	},
	'npm' : {
		'release' : false,
	},
}
