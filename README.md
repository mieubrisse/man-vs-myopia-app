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

TODO: Continuous deployment
```
npm run build && pushd functions && npm run build && popd && firebase deploy
```

#### Data structure

Firestore data is stored per user at `users/{userId}/data/userData`, ie user `123` will have a document at `users/123/data/userData`.

#### Functions

The `getUserDataBySecret` endpoint is guarded by a shared secret. **This repository is
public, so the secret is never stored here** -- not in this file, not as a default in the
function source, and not in a dotenv file. It lives in a Cloud Secret Manager secret named
`SHARED_SECRET` in the Firebase project, and the function declares it so that Firebase
injects it at runtime. A deploy that has not been given the secret fails rather than
falling back to anything committed.

To set or rotate it:

```
firebase functions:secrets:set SHARED_SECRET
```

That command also grants the function's runtime service account read access to the
secret. If the secret is instead created through the Google Cloud console, that grant has
to be added by hand -- the runtime service account needs
`roles/secretmanager.secretAccessor` on the secret, and Cloud Run checks for it when the
revision is created, so the grant must be in place *before* the next deploy.

To call the API, substituting the secret's current value and the Firebase Auth UID of the
user whose data you want:

```
curl -v -X GET -H "x-api-key: $SHARED_SECRET" \
  "https://us-central1-myopia-data-streams.cloudfunctions.net/getUserDataBySecret?userId=$USER_ID"
```
