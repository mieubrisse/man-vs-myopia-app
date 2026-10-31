# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```

### Firebase

To initialise firebase for local development run `npm install -g firebase-tools` and then `firebase login` and `firebase init`.

To launch the local firebase emulator run `firebase emulators:start --export-on-exit --import ./firebase-data-temp`.

#### Deployment

The site deploys itself: Vercel builds every push and a merge to `main` ships to
production. Firebase Hosting is a second, older origin for the same app and is not
updated by that pipeline.

Firestore rules are not covered by it either, so changes to `firestore.rules` take effect
only when deployed by hand:
```
firebase deploy --only firestore:rules
```

To deploy hosting and rules to Firebase instead:
```
npm run build && firebase deploy
```

#### Data structure

Firestore data is stored per user at `users/{userId}/data/userData`, ie user `123` will have a document at `users/123/data/userData`.

#### Functions

There are none. A `getUserDataBySecret` HTTP function used to live here, gated by a
shared secret and reading any user's document through the Firebase Admin SDK, which
bypasses Firestore security rules. It was deleted on 2026-10-31 along with its
`SHARED_SECRET` secret: the secret had been published in this public repository, the
function was invokable by `allUsers` from anywhere, and nothing in the app called it.

If an external read path is ever needed again, build it with per-user authentication
rather than a shared bearer token. See Linear KEV-144.
