import { GAME, INIT_CAM } from '../settings.js'
import { Vector2, Vector3 } from '../utils/wglm-classes.js'
import * as wglm from '../utils/wglm.js'

import Camera, { CameraMovement } from "./camera.js";
import SceneBuilder from './sceneBuilder.js';

/**
 * Responsable for the management of each
 *  object, its frame logic update and 
 *  keyboard input
 *
 * @export
 * @class Scene
 * @typedef {Scene}
 */
export default class Scene {
    gameManager;
    camera; players;
    drawPile; coinBank;

    #hoveredObject = null;
    
    constructor() {
        this.camera = new Camera(
            INIT_CAM.position, 
            new Vector3(0, 1, 0), 
            INIT_CAM.yaw, 
            INIT_CAM.pitch,
            INIT_CAM.zoom
        );
        
        const { players, drawPile, coinBank } = SceneBuilder.build();
        this.players  = players;
        this.drawPile = drawPile;
        this.coinBank = coinBank;
    }

    update(dt, keys) {
        this.processInput(dt, keys);

        this.camera.update(dt);
        this.players.forEach(player => player.update(dt));
    }

    processInput(dt, keys) {
        if(keys['KeyQ']) this.players[0].revealCard(0, this.camera); keys['KeyQ'] = false;
        if(keys['KeyW']) this.players[1].revealCard(0, this.camera); keys['KeyW'] = false;
        if(keys['KeyE']) this.players[2].revealCard(0, this.camera); keys['KeyE'] = false;
        if(keys['KeyR']) this.players[3].revealCard(0, this.camera); keys['KeyR'] = false;

        if(keys['KeyA']) this.players[0].returnCard(0); keys['keyA'] = false;
        if(keys['KeyS']) this.players[0].drawCard(0, Math.floor(Math.random() * GAME.totalCardTypes)); keys['KeyS'] = false;
        if(keys['KeyD']) this.players[2].returnCard(0); keys['keyD'] = false;
        if(keys['KeyF']) this.players[2].drawCard(0, Math.floor(Math.random() * GAME.totalCardTypes)); keys['KeyF'] = false;

        if(keys['KeyZ']) this.players[0].buy(2);   keys['KeyZ'] = false;
        if(keys['KeyX']) this.players[0].spend(2); keys['KeyX'] = false;
        if(keys['KeyC']) this.players[1].buy(2);   keys['KeyC'] = false;
        if(keys['KeyV']) this.players[1].spend(2); keys['KeyV'] = false;
    }
    
    /**
     * Checks if mouse is hovering an object
     * Only works for renderable objects
     * 
     * Assumes mouse coords are already in
     *  normalized device coordinates (ndc)
     *
     * If hovering an object, calls respective
     *  onMouseEnter and onMouseExit functions
     * 
     * @param {Number} mouseX 
     * @param {Number} mouseY 
     * @param {Number} aspectRatio 
     */
    processMouseOver(mouseX, mouseY, aspectRatio) {
        const screenPoint = new Vector2(mouseX, mouseY);
        const ray = this.camera.rayCast(screenPoint, aspectRatio);
        
        const iterableObjects = this.players[0].cards; // For now...

        let closestObj = null;
        let closestHit = null;
        let minDist = Infinity;
        for(const ro of iterableObjects) {
            if(!ro) continue;
            const hit = ro.intersectRay(ray);

            if(hit) {
                const dist = wglm.distanceSquared(hit, ray.origin);

                if(dist < minDist) {
                    minDist = dist;
                    closestObj = ro;
                    closestHit = hit;
                }
            }
        }

        if(this.#hoveredObject != closestObj) {
            if(this.#hoveredObject) this.#hoveredObject.onMouseExit();
            if(closestObj) closestObj.onMouseEnter(closestHit);
            this.#hoveredObject = closestObj;
        } else {
            if(this.#hoveredObject) 
                this.#hoveredObject.onMouseOver(closestHit);
        }
    }

    getAllObjects() {
        const cards = [...this.drawPile];
        const coins = [...this.coinBank];

        for(const p of this.players) {
            cards.push(...p.cards);
            coins.push(...p.coinStack.getAllCoins());
        }
        return { cards, coins };
    }
}