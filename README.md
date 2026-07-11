# 🏝️ Lost Magic Isles

A 3D fantasy adventure game developed with Three.js and Vite for the Interactive Graphics course at Sapienza University of Rome.

The player explores a magical world made of floating islands, fantasy characters, interactive quests, dynamic weather effects, procedural animations, and story-driven challenges.

---

## 📖 Overview

**Lost Magic Isles** is an interactive 3D adventure set in a magical kingdom suspended in the sky.

The player must help the inhabitants of the floating islands restore the magic that has disappeared from their world. During the adventure, the protagonist explores different areas, retrieves magical artifacts, fights a dragon, travels on a flying carpet, repairs a broken bridge, and completes interactive challenges.

The project focuses on real-time 3D graphics, hierarchical models, procedural animation, user interaction, collision detection, particle systems, dynamic lighting, and modular game-state management.

---

## 🛠️ Technologies Used

- JavaScript
- Three.js
- Vite
- HTML
- CSS
- WebGL
- GLTF / GLB 3D models
- Meshopt compression and decoding

---

## 🌍 Main Features

### 🏰 3D Fantasy World

The game world contains several interconnected fantasy environments, including:

- Floating islands
- A magical castle
- Fantasy houses and towers
- Forests and vegetation
- A broken bridge
- Clouds and rain
- Decorative lamps and props
- Interactive characters
- A flying carpet
- A portal connecting different areas
- A final village environment

The environments change as the story progresses, helping guide the player through the different stages of the adventure.

---

### 🦴 Hierarchical Models and Procedural Animation

The project uses rigged GLB models containing hierarchical skeleton structures.

No imported animation clips are used. Character animations are generated procedurally in JavaScript by modifying the transformations of individual bones at runtime.

The player character contains several connected body parts, including:

- Hips and spine
- Head
- Shoulders
- Upper arms and forearms
- Upper legs and lower legs
- Feet

During movement, the arms and legs swing in alternating directions, while smaller movements are applied to the torso and head.

The same hierarchical approach is also used for other animated characters, including the dragon and Master Shifu.

---

### 🧙 Interactive Characters

The player can interact with several characters throughout the story, including:

- The Mage
- Master Shifu
- The Dragon
- Village characters
- Other fantasy creatures

Characters react to the player's position and current quest progress.

Dialogue sequences are activated through keyboard interaction and are used to introduce missions, explain objectives, and unlock new stages of the game.

---

### 🎥 Camera System

The game supports two camera modes:

- **Third-person view:** the camera smoothly follows the player during exploration.
- **First-person view:** the camera is positioned at the character's eye level.

The player can switch between the two modes using the `V` key.

In third-person mode, the arrow keys rotate the camera and control its distance from the player.

In first-person mode, the vertical arrow keys control the viewing pitch.

---

### 📜 Quest System

The game follows a sequence of connected story-driven quests:

1. Talk to the mage.
2. Find the ancient magical book.
3. Return the book to the mage.
4. Reach the castle.
5. Fight the dragon.
6. Complete the dragon puzzle.
7. Obtain the magical gem.
8. Return the gem to the mage.
9. Receive the flying carpet as a reward.
10. Travel to Master Shifu's island.
11. Talk to Master Shifu.
12. Collect the axe.
13. Gather wood.
14. Repair the broken bridge.
15. Observe the transition to night and stormy weather.
16. Return through the portal.
17. Continue the final part of the adventure.

Each completed task updates the game state and unlocks the next stage of the story.

---

### 📕 Magical Book Quest

The first quest requires the player to find an ancient magical book.

The book is surrounded by a procedural particle effect and floats in the environment. When collected, it follows the player until it is delivered to the mage.

The object changes its position and state according to the player's progress.

---

### 💎 Magical Gem Quest

After defeating the dragon, the player can retrieve a magical gem.

The gem includes:

- Floating movement
- A glowing particle aura
- Collection interaction
- Player-following behaviour
- Delivery interaction
- A final orbit around the mage

Delivering the gem completes the first major section of the adventure and unlocks the flying carpet.

---

### 🐉 Dragon Fight

Inside the castle area, the player faces a flying dragon.

The dragon follows a procedural orbit around the castle. Its flight position is calculated according to the dimensions and centre of the castle environment.

Its wing animation is generated at runtime by interpolating the rotations of multiple bones without using imported animation clips.

The player attacks the dragon using the `R` key. Successful attacks trigger:

- Health reduction
- Damage flashes
- Particle explosions
- An expanding shockwave
- Puzzle-based combat phases
- A final defeat animation

After the dragon is defeated, the magical gem becomes available and the next quest is unlocked.

---

### 🧩 Puzzle Minigame

The dragon fight includes an interactive image puzzle.

At the beginning of the game, the player selects one of three difficulty levels:

- **Easy:** 2 × 2 puzzle
- **Medium:** 3 × 3 puzzle
- **Hard:** 4 × 4 puzzle

Puzzle pieces can be rearranged through drag-and-drop or mouse clicks.

The game counts the number of turns used to solve the puzzle. Completing the puzzle damages the dragon and allows the battle to continue.

---

### 🧹 Flying Carpet

After returning the magical gem to the mage, the player receives a flying carpet.

The carpet transports the protagonist from the main island to Master Shifu's island, unlocking a new environment and a new series of quests.

The travel sequence includes animated movement and camera coordination.

---

### 🪓 Wood Collection and Bridge Repair

On the second island, Master Shifu asks the player to repair a broken bridge.

The player must:

1. Talk to Master Shifu.
2. Collect the axe.
3. Gather the required wood.
4. Reach the broken bridge.
5. Use the collected resources to repair it.

The bridge construction sequence contains animated particles and a transition between the broken and repaired models.

Completing the bridge quest triggers the next environmental transformation.

---

### 🌧️ Weather and Atmosphere

The game contains dynamic atmospheric effects such as:

- Procedural clouds
- Rain particles
- Night transition
- Storm effects
- Lighting changes
- Decorative lamps
- Environmental colour changes

After the bridge is repaired, the scene gradually becomes darker, rain begins, and the lamps help illuminate the environment.

These effects visually represent the progression of the story.

---

### ✨ Particle Systems

Several objects and events use custom particle systems, including:

- Magical book particles
- Gem aura particles
- Dragon damage particles
- Dragon defeat effects
- Bridge construction particles
- Rain
- Magical sparkles
- Shockwave effects

Particle positions, opacity, scale, speed, and lifetime are updated procedurally during the animation loop.

---

### 💡 Lighting and Shadows

The scene uses multiple types of lighting:

- Ambient light for general scene illumination
- Directional light representing sunlight
- Decorative local lights
- Dynamic lighting changes during the night sequence

The directional light casts real-time shadows.

Shadow-map size, camera bounds, bias, and normal bias are configured to balance graphical quality and performance.

---

### 🎨 Materials and Textures

The project uses textured and physically based materials for imported models and procedural objects.

The materials include:

- Colour maps
- Standard roughness values
- Metalness parameters
- Emissive effects
- Transparent materials
- Additive blending
- Texture-based particle sprites

Some imported materials are reconstructed or adjusted at runtime to improve their appearance under the scene lighting.

---

### 📦 Imported 3D Models

Several GLB models are used in the project, including:

- Player character
- Fantasy houses
- Castle
- Mage
- Ancient book
- Magical gem
- Dragon
- Master Shifu
- Axe
- Wood
- Bridge
- Flying carpet
- Towers
- Portal
- Village characters
- Decorative objects

The models are loaded using `GLTFLoader`.

Optimized models use Meshopt compression and are decoded at runtime through `MeshoptDecoder`.

---

### 🚧 Collision Detection

The project implements collision detection using bounding boxes and a circular approximation of the player's horizontal area.

Collision checks prevent the player from walking through objects such as:

- Buildings
- Trees
- Props
- Towers
- Quest objects
- Environmental obstacles

Movement is checked independently along the X and Z axes, allowing the player to slide naturally along obstacles instead of stopping completely.

---

### 🔊 Audio System

The game includes looping background music implemented through the Three.js audio system.

An `AudioListener` is attached to the camera, while the music is loaded asynchronously using `AudioLoader`.

Playback starts after the first user interaction, following browser audio restrictions.

---

## 🎮 Controls

| Key | Action |
|---|---|
| `W` | Move forward |
| `A` | Move left |
| `S` | Move backward |
| `D` | Move right |
| `Arrow Left` | Rotate the camera left |
| `Arrow Right` | Rotate the camera right |
| `Arrow Up` | Zoom in or look upward in first-person mode |
| `Arrow Down` | Zoom out or look downward in first-person mode |
| `V` | Switch between first-person and third-person view |
| `E` | Talk to characters |
| `Enter` | Continue or close dialogues |
| `F` | Pick up, deliver, build, or use interactive objects |
| `R` | Attack the dragon |

---

## 📁 Project Structure

```text
final-project-dream_team/
│
├── public/
│   ├── models_optimized/     # Optimized GLB / GLTF models
│   ├── textures/             # Environment and material textures
│   ├── music/                # Background music
│   └── ...
│
├── src/
│   ├── base/                 # Scene, camera, renderer, lights and helpers
│   ├── controls/             # Player movement, collisions and camera controls
│   ├── imported_models/      # Characters, quest objects and model loading
│   ├── minigame/             # Puzzle logic, images and styling
│   ├── player/               # Player model and procedural animation
│   ├── ui/                   # Dialogues and objective messages
│   ├── world/                # Islands, weather, bridge, portal and finale
│   ├── main.js               # Main application and game-state coordination
│   └── style.css             # Main interface styling
│
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
└── README.md
```

---

## 📋 Requirements

To run the project locally, the following tools are required:

- Node.js
- npm
- A modern browser with WebGL support
- Hardware acceleration enabled

---

## 🚀 Installation

Clone the repository:

```bash
git clone https://github.com/SapienzaInteractiveGraphicsCourse/final-project-dream_team.git
```

Enter the project folder:

```bash
cd final-project-dream_team
```

Install the dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Then open the local address shown in the terminal.

Usually it is:

```text
http://localhost:5173/
```

---

## 🏗️ Build

To create a production build:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

---

## ✨ Graphics Techniques

The project demonstrates several real-time computer graphics techniques:

- Real-time 3D scene creation with Three.js
- Perspective projection
- Scene-graph organization through `THREE.Group`
- Hierarchical skeleton-based models
- Procedural bone animation implemented in JavaScript
- Third-person character control
- First-person camera mode
- Smooth camera following
- Ambient and directional lighting
- Dynamic lighting transitions
- Real-time shadow mapping
- Physically based materials
- Texture mapping on imported models
- Transparent and emissive materials
- Additive particle systems
- Procedural clouds and rain
- Dynamic storm effects
- Axis-aligned bounding-box collision detection
- Distance-based interactions
- GLTF / GLB model loading
- Meshopt decoding
- Modular quest and game-state management
- Interactive HTML and CSS interfaces
- Three.js audio playback

---

## ⚙️ Performance Optimizations

To improve loading time and runtime performance, the project includes:

- GLB model optimization with `gltfpack`
- Meshopt compression and decoding
- Deferred loading of models belonging to later game areas
- Limited renderer pixel ratio
- Conditional antialiasing
- Reduced shadow-map resolution
- Selective shadow casting
- Reuse of vectors and bounding boxes during update loops
- Modular loading of different game stages
- High-performance WebGL renderer preference

---

##  Notes

This project was created for educational purposes.

All 3D models, textures, music, and external assets are used as part of a university project.

##  Authors

Project developed for the Interactive Graphics course at Sapienza University of Rome by:

  * Arianna Linington
  * Gabriel Adam
  * Martina Ligorio

##  Course

Interactive Graphics  
Sapienza University of Rome
