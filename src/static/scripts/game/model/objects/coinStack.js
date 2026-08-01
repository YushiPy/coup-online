import { Vector3 } from "../../utils/wglm-classes.js";
import { OBJ, ANIM } from "../../settings.js";

import Coin from "./coin.js";
import CoinStackAnimator from "../animations/coinStackAnimator.js";

export default class CoinStack {
    position; animator;
    coins; 

    #spentCoins;
    #heightPadding;

    constructor(position, coinsCount, heightPadding) {
        this.position = position;
        this.coins = []; this.#spentCoins = new Set();
        this.#heightPadding = heightPadding;

        this.animator = new CoinStackAnimator(this);

        for(let i=0; i<coinsCount; i++) {
            this.coins.push(this.#createCoin(position, i));
        }
    }

    update(dt) {
        this.coins.forEach(coin => coin.update(dt));
        this.#spentCoins.forEach(coin => coin.update(dt));
    }

    buy(numOfCoins) {
        // Assumes caller checks length
        if(numOfCoins <= 0) return Promise.resolve();
        const delayTime = ANIM.coinStack.delayBetweenCoins * 1000;
        const animations = [];
        for(let i=0; i<numOfCoins; i++) {
            animations.push(this.#delay(delayTime * i).then(() => this.#buyCoin()));
        };
        return Promise.all(animations);
    }

    spend(numOfCoins) {
        if(numOfCoins > this.coins.length) numOfCoins = this.coins.length;
        if(numOfCoins <= 0) return Promise.resolve();
        const delayTime = ANIM.coinStack.delayBetweenCoins * 1000;
        const animations = [];
        for(let i=0; i<numOfCoins; i++) {
            animations.push(this.#delay(delayTime * i).then(() => this.#spendCoin()));
        }
        return Promise.all(animations);
    }

    setCount(numOfCoins) {
        this.coins = [];
        this.#spentCoins.clear();
        for(let i=0; i<numOfCoins; i++) {
            this.coins.push(this.#createCoin(this.position, i));
        }
    }

    getAllCoins() {
        return [...this.coins, ...this.#spentCoins];
    }

    #createCoin(position, index) {
        const pos = this.#getCoinPosition(position, index);
        return new Coin(pos, OBJ.coin.rotation, OBJ.coin.scale);
    }

    #getCoinPosition(position, index) {
        const padding = new Vector3(0, index * this.#heightPadding, 0);
        return Vector3.add(position, padding);
    }

    #delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async #buyCoin() {
        const newCoin = this.#createCoin(OBJ.coinBank.middlePos, 0);
        this.coins.push(newCoin);

        const stackPos = this.#getCoinPosition(this.position, this.coins.length-1);
        await this.animator.buy(newCoin, stackPos);
    }

    async #spendCoin() {
        const spentCoin = this.coins.pop();
        if(!spentCoin) return;
        this.#spentCoins.add(spentCoin);

        await this.animator.spend(spentCoin);
    }
}
