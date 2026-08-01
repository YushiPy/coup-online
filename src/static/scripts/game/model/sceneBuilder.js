import { ANIM, GAME, INIT_CAM, OBJ, PLAYERS } from '../settings.js';
import { Vector3, addv3 } from "../utils/wglm-classes.js";

import Card from "./objects/card.js";
import Coin from "./objects/coin.js";
import CoinStack from "./objects/coinStack.js";
import Player from "./objects/player.js";

/**
 * Responsable for generating game's initial scene.
 *  Wich includes the manipulation of objects positions
 *  and rotations, and it's creation
 *
 * @export
 * @class SceneBuilder
 * @typedef {SceneBuilder}
 */
export default class SceneBuilder {
    static configsApplied = false;

    /**
     * Builds intial scene and return it's objects
     *
     * @static
     * @returns {{ players: Player[]; drawPile: Card[]; coinBank: Coin[]; }} 
     */
    static build(playerCount = 0) {
        if(!this.configsApplied) this.#applyInitialSettings();

        const players = this.generatePlayers(playerCount);
        const { drawPile, coinBank } = this.#generateSupply();
        return { players, drawPile, coinBank };
    }

    static generatePlayers(playerCount) {
        if(!this.configsApplied) this.#applyInitialSettings();
        return Array.from({ length: playerCount }, (_, idx) => {
            const layout = this.#layoutForPlayer(idx, playerCount);
            const coinStack = new CoinStack(layout.pos.coinStack, GAME.playerCoinCount, PLAYERS.coinHeightPadding);

            const frontIdx = Math.floor(Math.random() * GAME.totalCardTypes);
            const backIdx  = Math.floor(Math.random() * GAME.totalCardTypes);

            const frontCard = new Card(frontIdx, layout.pos.frontCard, layout.rot.frontCard);
            const backCard  = new Card(backIdx,  layout.pos.backCard,  layout.rot.backCard);

            return new Player(idx, layout, coinStack, frontCard, backCard);
        });
    }

    static #mirrorPos(v) { return Vector3.hadMult(v, new Vector3(-1, 1, 1)); }
    static #mirrorRot(v) { return Vector3.hadMult(v, new Vector3(1, -1, 1)); }

    
    /**
     * Apply initial settings of distance and camera to all
     *  objects of the scene.
     * Calculates players positions and rotations. Generating left 
     *  player positions and rotation from mirroring right player
     *
     * @private
     * @static
     */
    static #applyInitialSettings() {
        const { playerDistance, sidePlayerDistance } = GAME;
        const { cardHeight, coinHeight, user, side, upper } = PLAYERS;
        const { drawPile, coinBank } = OBJ;
        PLAYERS.lSide = { pos: {}, rot: {}}
        const lSide = PLAYERS.lSide;

        // User Objects
        for(let key in user.pos) 
            user.pos[key] = addv3(user.pos[key], INIT_CAM.position); 
    
        // Other Players Objects
        [upper.pos, side.pos].forEach(p => {
            for(let key in p) {
                p[key].y += key === "coinStack" ? coinHeight : cardHeight;
                p[key].z += playerDistance;
            }
        });

        for(let key in side.pos) {
            side.pos[key].x += sidePlayerDistance;
            lSide.pos[key] = this.#mirrorPos(side.pos[key]);
            if(side.rot[key]) lSide.rot[key] = this.#mirrorRot(side.rot[key]);
        }

        // Supplies
        drawPile.position.z += playerDistance;
        coinBank.position.z += playerDistance;
        
        drawPile.middlePos = addv3(
            drawPile.position,
            new Vector3(0, (drawPile.count / 2) * drawPile.heightPadding, 0)
        );
        coinBank.middlePos = addv3(
            coinBank.position,
            new Vector3(0, (coinBank.count / 2) * coinBank.heightPadding, 0)
        );

        drawPile.cardInFront = { };
        drawPile.cardInFront.pos = addv3(drawPile.middlePos, ANIM.card.returnDrawPile.drawPileOffset);
        drawPile.cardInFront.rot = new Vector3(90, drawPile.rotation.y, 0.0);


        this.configsApplied = true;
    }

    static #layoutForPlayer(idx, playerCount) {
        if(idx === 0) return this.#cloneLayout(PLAYERS.user);
        if(playerCount === 2) return this.#twoPlayerOpponentLayout();

        const opponentCount = Math.max(1, playerCount - 1);
        const t = opponentCount === 1 ? 0.5 : (idx - 1) / (opponentCount - 1);
        const angleDeg = 15 + t * 150;
        const angle = angleDeg * Math.PI / 180;
        const center = new Vector3(
            2.15 * Math.cos(angle),
            PLAYERS.cardHeight,
            GAME.playerDistance - 1.0 - 0.95 * Math.sin(angle)
        );
        const tangent = new Vector3(-Math.sin(angle), 0, Math.cos(angle));
        const radial = new Vector3(Math.cos(angle), 0, -Math.sin(angle));
        const separation = 0.34;
        const faceY = angleDeg <= 90
            ? 135 + (angleDeg / 90) * 45
            : -135 - ((180 - angleDeg) / 90) * 45;

        const frontCard = Vector3.add(center, Vector3.hadMult(tangent, new Vector3(separation, separation, separation)));
        const backCard = Vector3.add(center, Vector3.hadMult(tangent, new Vector3(-separation, -separation, -separation)));
        const coinStack = Vector3.add(
            new Vector3(center.x, PLAYERS.coinHeight, center.z),
            Vector3.hadMult(radial, new Vector3(0.58, 0.58, 0.58))
        );

        return {
            pos: {
                coinStack,
                frontCard,
                backCard,
                loneCard: center.clone(),
            },
            rot: {
                frontCard: new Vector3(-8.0, faceY, -5.0),
                backCard:  new Vector3(-8.0, faceY,  5.0),
                loneCard:  new Vector3(-8.0, faceY,  0.0),
            },
        };
    }

    static #twoPlayerOpponentLayout() {
        const center = new Vector3(0.0, PLAYERS.cardHeight, GAME.playerDistance - 1.2);
        return {
            pos: {
                coinStack: new Vector3(0.62, PLAYERS.coinHeight, GAME.playerDistance - 1.05),
                frontCard: new Vector3(0.16, PLAYERS.cardHeight, center.z),
                backCard:  new Vector3(-0.16, PLAYERS.cardHeight, center.z - 0.04),
                loneCard:  center,
            },
            rot: {
                frontCard: new Vector3(-10.0, -180.0, -5.0),
                backCard:  new Vector3(-10.0, -180.0,  5.0),
                loneCard:  new Vector3(-10.0, -180.0,  0.0),
            },
        };
    }

    static #cloneLayout(layout) {
        return {
            pos: Object.fromEntries(Object.entries(layout.pos).map(([key, value]) => [key, value.clone()])),
            rot: Object.fromEntries(Object.entries(layout.rot).map(([key, value]) => [key, value.clone()])),
        };
    }

    /**
     * Generates table central supplies: Draw pile and the coin bank.
     *  Stacking it by incrementing it's y axis.
     * Each supply is a static object, in other words, doesn't have a
     *  frame update logic, are only rendered in the screen.
     * 
     * @private
     * @returns {{ drawPile: Card[], coinBank: Coin[] }}
     */
    static #generateSupply() {
        const playerDist = GAME.playerDistance;
        const drawPile = [], coinBank = [];

        // First, the drawPile
        for(let i=0; i<OBJ.drawPile.count; i++) {
            const padding = i * OBJ.drawPile.heightPadding;
            const pos = OBJ.drawPile.position.clone();
            pos.y += padding;
            drawPile.push(new Card(0, pos, OBJ.drawPile.rotation));
        };

        // Then, the coinBank
        for(let i=0; i<OBJ.coinBank.count; i++) {
            const heightPadding = i * OBJ.coinBank.heightPadding;
            const pos = OBJ.coinBank.position.clone();
            pos.y += heightPadding
            coinBank.push(new Coin(pos));
        };

        return { drawPile, coinBank };
    }
}
