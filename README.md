# Phaser 3 Connect Four Multiplayer Game

A Phaser 3 implementation of Connect Four with multiplayer support. Multiplayer support is possible due to Playroomkit.

## Local Development

### Requirements

[Node.js](https://nodejs.org) and [pnpm](https://pnpm.io/) are required to install dependencies and run scripts via `pnpm`.

[Vite](https://vitejs.dev/) is required to bundle and serve the web application. This is included as part of the projects dev dependencies.

### Available Commands

| Command | Description |
|---------|-------------|
| `pnpm install --frozen-lockfile` | Install project dependencies |
| `pnpm start` | Build project and open web server running project |
| `pnpm build` | Builds code bundle for production |
| `pnpm lint` | Uses ESLint to lint code |

### Writing Code

After cloning the repo, run `pnpm install --frozen-lockfile` from your project directory. Then, you can start the local development
server by running `pnpm start`.

After starting the development server with `pnpm start`, you can edit any files in the `src` folder
and parcel will automatically recompile and reload your server (available at `http://localhost:8080`
by default).

### Deploying Code

After you run the `pnpm build` command, your code will be built into a single bundle located at
`dist/*` along with any other assets you project depended.

If you put the contents of the `dist` folder in a publicly-accessible location (say something like `http://myserver.com`),
you should be able to open `http://myserver.com/index.html` and play your game.

### Static Assets

Any static assets like images or audio files should be placed in the `public` folder. It'll then be served at `http://localhost:8080/path-to-file-your-file/file-name.file-type`.


https://docs.joinplayroom.com/
https://docs.joinplayroom.com/blog/multiplayerhard
https://joinplayroom.com/
https://github.com/devshareacademy/phaser-3-connect-four-multiplayer-with-playroomkit/releases/tag/initial-project
