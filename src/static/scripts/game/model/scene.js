import { INIT_CAM } from '../settings.js'
import { Vector2, Vector3 } from '../utils/wglm-classes.js'
import * as wglm from '../utils/wglm.js'

import Camera from "./camera.js";
import MatchAnimationController from './matchAnimationController.js';
import SceneBuilder from './sceneBuilder.js';
import { HIDDEN_CARD_TYPE } from './objects/player.js';

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
    #matchAnimationController;
    
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
        this.#matchAnimationController = new MatchAnimationController();
    }

    handleGameState(state) {
        this.#matchAnimationController.handleState(state, this);
    }

    update(dt) {
        this.camera.update(dt);
        this.players.forEach(player => player.update(dt));
    }

    ensurePlayerCount(playerCount) {
        if(this.players.length === playerCount) return;
        this.players = SceneBuilder.generatePlayers(playerCount);
        this.#hoveredObject = null;
    }

    syncToState(state, playerSlots) {
        for(const [playerId, slot] of playerSlots.entries()) {
            const wirePlayer = state.players[playerId];
            const scenePlayer = this.players[slot];
            if(!wirePlayer || !scenePlayer) continue;

            scenePlayer.setCoinCount(wirePlayer.coins);
            scenePlayer.setCards(this.#cardTypesForPlayer(playerId, state));
        }
    }

    animatePlayerCoins(playerId, amount, playerSlots) {
        const player = this.#scenePlayer(playerId, playerSlots);
        return player ? player.buy(amount) : Promise.resolve();
    }

    animatePlayerSpend(playerId, amount, playerSlots) {
        const player = this.#scenePlayer(playerId, playerSlots);
        return player ? player.spend(amount) : Promise.resolve();
    }

    animateReveal(playerId, cardType, disappear, playerSlots) {
        const player = this.#scenePlayer(playerId, playerSlots);
        if(!player) return Promise.resolve();

        const cardIdx = player.firstCardIndex();
        if(cardIdx === -1) return Promise.resolve();
        if(cardType) player.setCardType(cardIdx, cardType);
        return player.revealCard(cardIdx, this.camera, disappear);
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
        
        const iterableObjects = this.players[0]?.cards || []; // For now...

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

    #scenePlayer(playerId, playerSlots) {
        const slot = playerSlots.get(playerId);
        return slot === undefined ? null : this.players[slot];
    }

    #cardTypesForPlayer(playerId, state) {
        if(playerId === state.localPlayerId) {
            return (state.yourHand || []).slice(0, 2);
        }

        const player = state.players[playerId];
        const hiddenCount = Math.min(player?.numHiddenCards || 0, 2);
        return Array.from({ length: hiddenCount }, () => HIDDEN_CARD_TYPE);
    }
}
