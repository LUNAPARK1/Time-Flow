# Time-Flow
# Final Project - Time Flow : A Real-Time Sky Simulation

For my final project, I wanted to explore how digital space can express time without using traditional clocks. Instead of numbers or hands on a dial, I focused on light, color and atmosphere - things we intuitively understand as time, even without measuring it. 

This project is build entirely with Three.js and it uses real - world sunrise / sunset APIs to drive the motion of the sun and the color of the sky. 

---

## Concept

I wasn’t interested in “showing the time” 

I wanted to build a piece that feels like time. 

I think a window is the oldest timekeeping device we have - before clocks existed, light told us everything. 

Time is not linear - it’s emotional, atmospheric, seasonal, inconsistent. So I wanted a window-like digital landscape that reflects how the world shifts throughout the day :

- The sun traveling in a natural arc
- Sky colors transitioning smoothly
- Starts only appearing after twilight

The goal wasn’t accuracy - it was more aesthetics

---

### What the Project Does

Time Flow simulates the NYC skyline through an atmospheric window. 

### Core Features

- Real Sunrise / Sunset fetched through API
    - The system updates daily based on real solar times
- Physically believable sun path
    - The sun doesn’t rotate around the viewer; it travels across the skyline as it does in real life.
- Color transition inspired by real atmospheric scattering
    - Dawn, morning, noon, sunset, blue hour and night each have their own palette.
- Star + Twilight Logic
    - Stars fade in only after sunset and fade out as the sun rises
- Time slider
    - Lets the viewer manually scrub through an entire day
- A digital window composition
    - The scene is framed like looking out of an apartment window at the NYC skyline
