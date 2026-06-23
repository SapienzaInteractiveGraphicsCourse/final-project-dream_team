# TODO - Fix cloud not working

- [ ] Update `src/world/cloud.js` so `createCloud` receives `scene` and does not reference an undefined global `scene`.
- [ ] Remove auto-creation of `cloud1..cloud5` inside `cloud.js` (they should be created/owned by `main.js`).
- [ ] Update `src/main.js` to store returned clouds (`cloud1..cloud5` or an array) from `createCloud(scene, ...)`.
- [ ] Update the animation loop to move the stored cloud objects (so `cloud1..cloud5` are actually defined).
- [x] Run dev/build (if applicable) to verify no runtime errors.


