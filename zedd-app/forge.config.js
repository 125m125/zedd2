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
        // remoteReleases removed: it caused SyncReleases.exe to download ALL
        // previous nupkgs from prior releases and re-upload them each release,
        // bloating RELEASES. Without it, RELEASES only lists the current
        // version's full+delta. That's all Squirrel's `--update` needs: it
        // installs the latest full nupkg when the installed version doesn't
        // match a delta base, so the old chain is never downloaded at runtime.
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