# TODO - Fix cloud not working

- [x] Update `src/world/cloud.js` so `createCloud` receives `scene` and does not reference an undefined global `scene`.
- [x] Remove auto-creation of `cloud1..cloud5` inside `cloud.js` (they should be created/owned by `main.js`).
- [x] Update `src/main.js` to store returned clouds (`cloud1..cloud5` or an array) from `createCloud(scene, ...)`.
- [x] Update the animation loop to move the stored cloud objects (so `cloud1..cloud5` are actually defined).
- [x] Run dev/build (if applicable) to verify no runtime errors.

