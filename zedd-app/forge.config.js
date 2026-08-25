module.exports = {
  packagerConfig: {
    ignore: [
      '\\.gitignore',
      'node_modules/\\.cache',
      '.*\\.(iobj|pdb|ipdb)$',
    ],
    derefSymlinks: true,
    icon: 'icons/app',
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'zedd',
        remoteReleases: 'https://github.com/125m125/zedd2',
        // Authenticate the sync-releases step with a token so it does not hit
        // the unauthenticated GitHub API rate limit during `electron-forge make`.
        // Resolves to undefined locally (no token) and is then skipped.
        remoteToken: process.env.GITHUB_TOKEN,
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-webpack',
      config: {
        mainConfig: './webpack.main.config.js',
        devContentSecurityPolicy: "connect-src 'self' * 'unsafe-inline' blob: data: gap:",
        renderer: {
          config: './webpack.renderer.config.js',
          entryPoints: [
            {
              html: './src/index.html',
              js: './src/renderer.ts',
              name: 'main_window',
            },
          ],
        },
        loggerPort: '4200',
      },
    },
  ],
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: '125m125',
          name: 'zedd2',
        },
        prerelease: false,
      },
    },
  ],
}
