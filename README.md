# 🏰 Fantasy Island Adventure

A 3D fantasy adventure game developed with **Three.js** and **Vite** for the Interactive Graphics course at **Sapienza University of Rome**.

The player explores a magical world made of floating islands, fantasy characters, quests, interactive objects, weather effects, and story-driven challenges.

---

## 📌 Overview

**Fantasy Island Adventure** is an interactive 3D game set in a magical kingdom suspended in the sky.

The story follows a main character who is asked by a mage to recover a lost magical book.  
After completing this first quest, the player must enter the castle, fight a dragon, obtain a precious gem, and return it to the mage.

As a reward, the mage gives the protagonist a flying carpet, which allows the player to travel to Shifu's island.  
There, Shifu asks for help collecting wood and repairing a broken bridge.

Once the bridge is repaired, the world changes: night falls and rain begins.  
The protagonist then returns to the main island through a portal and meets a villager who offers shelter for the night.  
Before entering the house, the player must complete a small minigame to open the door.

After entering the house, the protagonist rests and wakes up the next morning, ready to begin a new adventure.

The project focuses on real-time 3D graphics, modular scene organization, imported GLB models, user interaction, collision detection, procedural animation, and dynamic visual effects.

---

## 🛠️ Technologies Used

- **JavaScript**
- **Three.js**
- **Vite**
- **HTML**
- **CSS**
- **GLTF / GLB 3D Models**

---

## 🎮 Main Features

### 🌍 3D Fantasy World

The game world includes:

- Floating islands
- A magical castle
- A broken bridge
- Clouds and rain
- Vegetation and decorative objects
- Fantasy houses and props
- Interactive characters
- A flying carpet
- A portal between islands
- A final village scene

The environment is designed to create a magical atmosphere and guide the player through different stages of the story.

---

### 🧍 Player Character

The player controls a 3D character imported from a GLB model.

The character includes a skeleton structure, allowing procedural animation of different body parts such as:

- Arms
- Legs
- Shoulders
- Feet
- Spine
- Head

The walking animation is generated procedurally by rotating the bones during movement.

---

### 🎥 Camera System

The game includes a third-person camera that follows the player during exploration.

A first-person mode is also available and can be activated during specific moments or interactions.

---

### 🧩 Quest System

The game is based on a sequence of story-driven quests:

1. Talk to the mage.
2. Find the ancient magical book.
3. Return the book to the mage.
4. Reach the castle.
5. Fight the dragon.
6. Obtain the gem hidden inside the castle.
7. Return the gem to the mage.
8. Receive the flying carpet as a reward.
9. Travel to Shifu's island.
10. Talk to Shifu.
11. Collect the axe.
12. Collect wood.
13. Repair the broken bridge.
14. Return to the main island through the portal.
15. Meet the villager.
16. Complete the door-opening minigame.
17. Enter the house and rest for the night.
18. Wake up the next morning, ready for a new adventure.

Each task unlocks the next step of the adventure.

---

### 🐉 Dragon Fight

Inside the castle, the player faces a dragon.

The fight is part of the main story and allows the protagonist to obtain the gem requested by the mage.

---

### 🧩 Minigame

The project includes a minigame connected to the final part of the story.

After returning to the main island at night, the protagonist meets a villager who offers hospitality.  
Before entering the house, the player must complete a minigame to open the door.

The specific mechanics of the minigame can be expanded or modified during development.

---

### 🧞 Flying Carpet

After returning the gem to the mage, the player receives a flying carpet.

The flying carpet allows the protagonist to travel from the main island to Shifu's island, unlocking a new area of the game.

---

### 🌧️ Weather and Atmosphere

The game contains dynamic atmospheric effects such as:

- Clouds
- Rain
- Night transition
- Storm-like atmosphere
- Lighting changes
- Decorative lamps

These effects help represent the evolution of the story.  
In particular, after repairing Shifu's bridge, the world becomes dark and rainy.

---

### 📦 Imported 3D Models

Several GLB models are used in the project, including:

- Fantasy houses
- Castle
- Mage
- Book
- Gem
- Dragon
- Master Shifu
- Axe
- Wood
- Bridge
- Flying carpet
- Portal
- Village characters
- Decorative objects

---

### 🚧 Collision Detection

The project implements collision detection using bounding boxes.

This prevents the player from walking through objects such as:

- Buildings
- Trees
- Props
- Quest objects
- Obstacles

---

## 🎮 Controls

| Key | Action |
|---|---|
| `W` | Move forward |
| `A` | Move left |
| `S` | Move backward |
| `D` | Move right |
| `Arrow Left` | Rotate camera left |
| `Arrow Right` | Rotate camera right |
| `Arrow Up` | Zoom in / look up |
| `Arrow Down` | Zoom out / look down |
| `V` | Switch camera view |
| `F` | Interact with the flying carpet |
| `R` | Attack the dragon |

---

## 📁 Project Structure

```text
final-project-dream_team/
│
├── public/
│   ├── models/              # Imported GLB / GLTF models
│   ├── textures/            # Textures used in the scene
│   ├── music/               # Audio files
│   └── ...
│
├── src/
│   ├── base/                # Scene, camera, renderer, lights
│   ├── controls/            # Player movement and camera controls
│   ├── imported_models/     # Imported objects and quest models
│   ├── minigame/            # Minigame logic
│   ├── player/              # Player model and animation
│   ├── world/               # Islands, bridge, rain, clouds, portal, finale
│   ├── main.js              # Main entry point
│   └── style.css            # Interface and styling
│
├── index.html
├── package.json
├── package-lock.json
└── README.md
```

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

## 📖 Gameplay Description

At the beginning of the game, the protagonist meets a mage on the main island.  
The mage explains that an important magical book has been lost and asks the player to recover it.

The player explores the island, finds the book, and brings it back to the mage.  
After this, the mage gives the protagonist a new mission: reach the castle, defeat the dragon, and recover the gem hidden inside.

Once the dragon is defeated, the player obtains the gem and returns it to the mage.  
As a reward, the mage gives the protagonist a flying carpet, which allows access to Shifu's island.

On Shifu's island, the player meets Master Shifu, who asks for help collecting wood and repairing a broken bridge.  
The protagonist collects the axe, gathers the wood, and repairs the bridge.

After the bridge is repaired, the atmosphere of the world changes.  
Night falls, the sky becomes darker, and it starts raining.

The protagonist then returns to the main island through a portal.  
There, the player meets a villager who offers shelter for the night.  
However, before entering the house, the protagonist must complete a minigame to open the door.

After successfully entering the house, the protagonist sleeps through the night and wakes up the next morning, ready to leave for another adventure.

This is where the game ends.

---

## ✨ Graphics Techniques

The project demonstrates several real-time computer graphics techniques:

- 3D scene creation with Three.js
- Perspective camera
- Third-person character control
- First-person camera mode
- Directional and ambient lighting
- Shadows
- GLB / GLTF model loading
- Skeleton-based animation
- Procedural walking animation
- Collision detection with bounding boxes
- Interactive UI dialogues
- Dynamic weather effects
- Night transition
- Modular code organization

---

## 📝 Notes

This project was created for educational purposes.

All 3D models, textures, music, and external assets are used as part of a university project.
## 👥 Authors

Project developed for the Interactive Graphics course at **Sapienza University of Rome** by:

- Arianna Linington
- Gabriel Adam
- Martina Ligorio

## 📚 Course

**Interactive Graphics**  
Sapienza University of Rome

